import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import mongoose from "mongoose";
import { backupConfig, BackupManifest, BackupManifestSchema } from "./backupConfig.js";

const execFileAsync = promisify(execFile);

export interface BackupOptions {
  mongoUri?: string;
  databaseName?: string;
  outputDir?: string;
  encrypt?: boolean;
  encryptionKeyHex?: string;
  prune?: boolean;
  environment?: string;
}

export interface BackupResult {
  success: boolean;
  manifest: BackupManifest;
  archivePath: string;
  manifestPath: string;
  durationMs: number;
}

/**
 * Computes the SHA-256 hash of a file.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}

/**
 * Encrypts a file using AES-256-GCM.
 * Structure: [12 bytes IV] + [Ciphertext] + [16 bytes AuthTag]
 */
export async function encryptFileAesGcm(
  sourcePath: string,
  destPath: string,
  keyHex: string
): Promise<void> {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== backupConfig.encryption.keyLengthBytes) {
    throw new Error(
      `Invalid encryption key length: expected ${backupConfig.encryption.keyLengthBytes} bytes, got ${key.length}`
    );
  }

  const iv = crypto.randomBytes(backupConfig.encryption.ivLengthBytes);
  const cipher = crypto.createCipheriv(backupConfig.encryption.algorithm, key, iv) as crypto.CipherGCM;

  const input = fs.createReadStream(sourcePath);
  const output = fs.createWriteStream(destPath);

  // Write IV first
  output.write(iv);

  await new Promise<void>((resolve, reject) => {
    input.pipe(cipher).pipe(output);
    output.on("finish", () => {
      try {
        const authTag = cipher.getAuthTag();
        fs.appendFileSync(destPath, authTag);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    input.on("error", reject);
    output.on("error", reject);
  });
}

/**
 * Decrypts a file encrypted with AES-256-GCM.
 */
export async function decryptFileAesGcm(
  sourcePath: string,
  destPath: string,
  keyHex: string
): Promise<void> {
  const key = Buffer.from(keyHex, "hex");
  const fileBuffer = await fs.promises.readFile(sourcePath);

  const ivLength = backupConfig.encryption.ivLengthBytes;
  const tagLength = backupConfig.encryption.authTagLengthBytes;

  if (fileBuffer.length < ivLength + tagLength) {
    throw new Error("Encrypted file corrupted or incomplete (smaller than IV + Tag).");
  }

  const iv = fileBuffer.subarray(0, ivLength);
  const authTag = fileBuffer.subarray(fileBuffer.length - tagLength);
  const ciphertext = fileBuffer.subarray(ivLength, fileBuffer.length - tagLength);

  const decipher = crypto.createDecipheriv(backupConfig.encryption.algorithm, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  await fs.promises.writeFile(destPath, decrypted);
}

/**
 * Prunes snapshots older than retention windows.
 */
export async function pruneOldBackups(backupDir: string, maxSnapshots: number = 30): Promise<string[]> {
  if (!fs.existsSync(backupDir)) return [];

  const files = await fs.promises.readdir(backupDir);
  const manifestFiles = files.filter((f) => f.endsWith(".manifest.json"));

  if (manifestFiles.length <= maxSnapshots) {
    return [];
  }

  // Sort manifests oldest first
  const manifestsWithTime: { file: string; time: number; manifest: BackupManifest }[] = [];
  for (const mFile of manifestFiles) {
    try {
      const raw = await fs.promises.readFile(path.join(backupDir, mFile), "utf-8");
      const parsed = JSON.parse(raw);
      manifestsWithTime.push({
        file: mFile,
        time: new Date(parsed.createdAt).getTime(),
        manifest: parsed
      });
    } catch {
      // Ignore unparseable
    }
  }

  manifestsWithTime.sort((a, b) => a.time - b.time);
  const toPrune = manifestsWithTime.slice(0, manifestsWithTime.length - maxSnapshots);
  const prunedFiles: string[] = [];

  for (const item of toPrune) {
    const mPath = path.join(backupDir, item.file);
    const aPath = path.join(backupDir, item.manifest.archiveFileName);
    if (fs.existsSync(mPath)) {
      await fs.promises.unlink(mPath);
      prunedFiles.push(mPath);
    }
    if (fs.existsSync(aPath)) {
      await fs.promises.unlink(aPath);
      prunedFiles.push(aPath);
    }
  }

  return prunedFiles;
}

/**
 * Executes a full database backup.
 */
export async function createDatabaseBackup(options: BackupOptions = {}): Promise<BackupResult> {
  const startTime = Date.now();
  const mongoUri = options.mongoUri || process.env.MONGO_URI || "mongodb://localhost:27017/lifeos";
  const databaseName = options.databaseName || backupConfig.defaultDatabaseName;
  const outputDir = options.outputDir || backupConfig.backupDir;
  const isEncrypted = options.encrypt ?? Boolean(process.env.BACKUP_ENCRYPTION_KEY);
  const encryptionKey = options.encryptionKeyHex || process.env.BACKUP_ENCRYPTION_KEY;
  const environment = options.environment || process.env.NODE_ENV || "development";

  if (isEncrypted && !encryptionKey) {
    throw new Error("Encryption requested but no encryption key (hex) provided.");
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    await fs.promises.mkdir(outputDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const backupId = `lifeos_backup_${databaseName}_${timestampStr}`;
  const rawArchiveName = `${backupId}.dump.gz`;
  const rawArchivePath = path.join(outputDir, rawArchiveName);

  // 1. Query MongoDB for collections & document counts before dump
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  const db = conn.useDb(databaseName);
  const collectionsList = await db.db!.listCollections().toArray();
  const collectionSummaries: { name: string; documentCount: number }[] = [];
  let totalDocs = 0;

  for (const col of collectionsList) {
    if (col.name.startsWith("system.")) continue;
    const count = await db.db!.collection(col.name).countDocuments();
    collectionSummaries.push({ name: col.name, documentCount: count });
    totalDocs += count;
  }
  await conn.close();

  // 2. Execute mongodump
  // Strip database name from URI if present so mongodump doesn't conflict with --db
  const baseUri = mongoUri.replace(/(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?/, "$1$3");
  const args = [
    `--uri=${baseUri}`,
    `--db=${databaseName}`,
    `--archive=${rawArchivePath}`,
    "--gzip"
  ];

  try {
    await execFileAsync("mongodump", args);
  } catch (err: any) {
    throw new Error(`mongodump execution failed: ${err.message || String(err)}`);
  }

  let finalArchiveFileName = rawArchiveName;
  let finalArchivePath = rawArchivePath;

  // 3. Optional AES-256-GCM encryption
  if (isEncrypted && encryptionKey) {
    const encArchiveName = `${backupId}.dump.gz.enc`;
    const encArchivePath = path.join(outputDir, encArchiveName);
    await encryptFileAesGcm(rawArchivePath, encArchivePath, encryptionKey);
    // Remove raw unencrypted archive
    await fs.promises.unlink(rawArchivePath);
    finalArchiveFileName = encArchiveName;
    finalArchivePath = encArchivePath;
  }

  // 4. Compute SHA-256 hash
  const sha256 = await computeFileSha256(finalArchivePath);
  const stats = await fs.promises.stat(finalArchivePath);

  // 5. Create manifest
  const manifest: BackupManifest = {
    id: backupId,
    databaseName,
    createdAt: new Date().toISOString(),
    archiveFileName: finalArchiveFileName,
    archiveSizeBytes: stats.size,
    sha256Hash: sha256,
    collections: collectionSummaries,
    totalDocuments: totalDocs,
    isEncrypted,
    encryptionAlgorithm: isEncrypted ? backupConfig.encryption.algorithm : undefined,
    compression: "gzip",
    environment,
    pitrWindow: {
      snapshotTimestamp: new Date().toISOString()
    }
  };

  BackupManifestSchema.parse(manifest);

  const manifestFileName = `${backupId}.manifest.json`;
  const manifestPath = path.join(outputDir, manifestFileName);
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // 6. Prune if requested
  if (options.prune !== false) {
    await pruneOldBackups(outputDir, backupConfig.retention.maxRetainedSnapshots);
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    manifest,
    archivePath: finalArchivePath,
    manifestPath,
    durationMs
  };
}
