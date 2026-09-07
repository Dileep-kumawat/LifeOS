import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root directory is 4 levels up from api/src/services/backup
const ROOT_DIR = path.resolve(__dirname, "../../../..");

export const backupConfig = {
  // Directory where local backups and manifests are stored
  backupDir: process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.resolve(ROOT_DIR, "backups"),

  // Primary database name
  defaultDatabaseName: "lifeos",

  // Isolated recovery target database name for testing / non-destructive restore
  defaultRecoveryDatabaseName: "lifeos_recovery",

  // Retention schedule (in days)
  retention: {
    dailyDays: 7,
    weeklyDays: 28,
    monthlyDays: 365,
    maxRetainedSnapshots: 30
  },

  // Encryption algorithm (AES-256-GCM)
  encryption: {
    algorithm: "aes-256-gcm",
    keyLengthBytes: 32, // 256-bit key
    ivLengthBytes: 12,  // 96-bit IV standard for GCM
    authTagLengthBytes: 16
  },

  // Operational limits & safety
  safety: {
    prohibitedProductionNames: ["lifeos_prod", "lifeos_production", "lifeos-cluster"],
    requireExplicitProductionOverwriteFlag: "--force-production-overwrite"
  }
};

export const BackupManifestSchema = z.object({
  id: z.string(),
  databaseName: z.string(),
  createdAt: z.string(), // ISO-8601
  archiveFileName: z.string(),
  archiveSizeBytes: z.number().int().nonnegative(),
  sha256Hash: z.string().length(64),
  collections: z.array(
    z.object({
      name: z.string(),
      documentCount: z.number().int().nonnegative()
    })
  ),
  totalDocuments: z.number().int().nonnegative(),
  isEncrypted: z.boolean(),
  encryptionAlgorithm: z.string().optional(),
  compression: z.enum(["gzip", "none"]),
  pitrWindow: z
    .object({
      earliestOplogTimestamp: z.string().optional(),
      latestOplogTimestamp: z.string().optional(),
      snapshotTimestamp: z.string()
    })
    .optional(),
  environment: z.string().default("production"),
  gitCommit: z.string().optional()
});

export type BackupManifest = z.infer<typeof BackupManifestSchema>;
