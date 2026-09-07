import path from "path";
import { fileURLToPath } from "url";
import {
  createDatabaseBackup,
  computeFileSha256,
  encryptFileAesGcm,
  decryptFileAesGcm,
  pruneOldBackups,
  type BackupOptions,
  type BackupResult
} from "../../api/src/services/backup/backupService.js";

export {
  createDatabaseBackup,
  computeFileSha256,
  encryptFileAesGcm,
  decryptFileAesGcm,
  pruneOldBackups,
  type BackupOptions,
  type BackupResult
};

// CLI invocation handler
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const dbArg = args.find((a) => a.startsWith("--db="))?.split("=")[1];
  const uriArg = args.find((a) => a.startsWith("--uri="))?.split("=")[1];
  const encryptArg = args.includes("--encrypt");

  createDatabaseBackup({
    databaseName: dbArg,
    mongoUri: uriArg,
    encrypt: encryptArg
  })
    .then((res) => {
      console.log("✅ Backup completed successfully!");
      console.log(`- Backup ID: ${res.manifest.id}`);
      console.log(`- Archive: ${res.archivePath} (${(res.manifest.archiveSizeBytes / 1024).toFixed(2)} KB)`);
      console.log(`- SHA-256: ${res.manifest.sha256Hash}`);
      console.log(`- Total Documents: ${res.manifest.totalDocuments}`);
      console.log(`- Duration: ${res.durationMs}ms`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Backup failed:", err);
      process.exit(1);
    });
}
