import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import mongoose from "mongoose";
import { backupConfig, BackupManifest, BackupManifestSchema } from "./backupConfig.js";
import { computeFileSha256, decryptFileAesGcm } from "./backupService.js";

const execFileAsync = promisify(execFile);

export interface RestoreOptions {
  archivePath: string;
  manifestPath?: string;
  targetDatabaseName?: string;
  mongoUri?: string;
  encryptionKeyHex?: string;
  forceProductionOverwrite?: boolean;
  dropExisting?: boolean;
}

export interface RestoreResult {
  success: boolean;
  targetDatabase: string;
  manifest: BackupManifest;
  restoredCollections: { name: string; documentCount: number }[];
  totalRestoredDocuments: number;
  durationMs: number;
}

/**
 * Validates whether the restore target is safe.
 * Blocks accidental restoration into production database.
 */
export function validateRestoreTargetSafety(
  targetDb: string,
  isProductionEnv: boolean,
  forceOverwrite: boolean = false
): void {
  const isProtectedName = backupConfig.safety.prohibitedProductionNames.includes(targetDb.toLowerCase());

  if ((isProtectedName || isProductionEnv) && !forceOverwrite) {
    throw new Error(
      `CRITICAL SAFETY VIOLATION: Refusing to restore to database "${targetDb}" in environment "${
        isProductionEnv ? "production" : "non-prod"
      }". ` +
        `Destructive restore against production requires explicit ${backupConfig.safety.requireExplicitProductionOverwriteFlag} flag.`
    );
  }
}

/**
 * Restores a database from a backup archive with integrity validation.
 */
export async function restoreDatabase(options: RestoreOptions): Promise<RestoreResult> {
  const startTime = Date.now();
  const mongoUri = options.mongoUri || process.env.MONGO_URI || "mongodb://localhost:27017/lifeos";
  const targetDb = options.targetDatabaseName || backupConfig.defaultRecoveryDatabaseName;
  const isProduction = process.env.NODE_ENV === "production";
  const dropExisting = options.dropExisting !== false;

  // 1. Safety verification
  validateRestoreTargetSafety(targetDb, isProduction, options.forceProductionOverwrite);

  if (!fs.existsSync(options.archivePath)) {
    throw new Error(`Backup archive file not found: ${options.archivePath}`);
  }

  // 2. Resolve & validate manifest
  let manifestPath = options.manifestPath;
  if (!manifestPath) {
    const candidateManifest = options.archivePath.replace(/\.dump\.gz(\.enc)?$/, ".manifest.json");
    if (fs.existsSync(candidateManifest)) {
      manifestPath = candidateManifest;
    }
  }

  if (!manifestPath || !fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found for archive: ${options.archivePath}`);
  }

  const manifestRaw = await fs.promises.readFile(manifestPath, "utf-8");
  const manifest: BackupManifest = BackupManifestSchema.parse(JSON.parse(manifestRaw));

  // 3. Verify SHA-256 Checksum
  const actualHash = await computeFileSha256(options.archivePath);
  if (actualHash.toLowerCase() !== manifest.sha256Hash.toLowerCase()) {
    throw new Error(
      `BACKUP INTEGRITY CORRUPTED: Archive hash mismatch! Expected: ${manifest.sha256Hash}, Actual: ${actualHash}`
    );
  }

  // 4. Decrypt if encrypted
  let archiveToRestore = options.archivePath;
  let tempDecryptedPath: string | null = null;

  if (manifest.isEncrypted) {
    const encryptionKey = options.encryptionKeyHex || process.env.BACKUP_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("Backup archive is encrypted, but no BACKUP_ENCRYPTION_KEY was provided.");
    }
    tempDecryptedPath = path.join(
      path.dirname(options.archivePath),
      `temp_dec_${Date.now()}_${manifest.archiveFileName.replace(/\.enc$/, "")}`
    );
    await decryptFileAesGcm(options.archivePath, tempDecryptedPath, encryptionKey);
    archiveToRestore = tempDecryptedPath;
  }

  // 5. Execute mongorestore
  const sourceDb = manifest.databaseName;
  const baseUri = mongoUri.replace(/(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?/, "$1$3");
  const args = [
    `--uri=${baseUri}`,
    `--archive=${archiveToRestore}`,
    "--gzip",
    `--nsInclude=${sourceDb}.*`,
    `--nsFrom=${sourceDb}.*`,
    `--nsTo=${targetDb}.*`
  ];

  if (dropExisting) {
    args.push("--drop");
  }

  try {
    await execFileAsync("mongorestore", args);
  } catch (err: any) {
    throw new Error(`mongorestore execution failed: ${err.message || String(err)}`);
  } finally {
    // Always cleanup temporary decrypted file
    if (tempDecryptedPath && fs.existsSync(tempDecryptedPath)) {
      await fs.promises.unlink(tempDecryptedPath);
    }
  }

  // 6. Connect to restored target database and verify restored data
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  const db = conn.useDb(targetDb);
  const collections = await db.db!.listCollections().toArray();
  const restoredSummaries: { name: string; documentCount: number }[] = [];
  let totalDocs = 0;

  for (const col of collections) {
    if (col.name.startsWith("system.")) continue;
    const count = await db.db!.collection(col.name).countDocuments();
    restoredSummaries.push({ name: col.name, documentCount: count });
    totalDocs += count;
  }
  await conn.close();

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    targetDatabase: targetDb,
    manifest,
    restoredCollections: restoredSummaries,
    totalRestoredDocuments: totalDocs,
    durationMs
  };
}
