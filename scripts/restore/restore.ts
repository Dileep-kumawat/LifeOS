import path from "path";
import { fileURLToPath } from "url";
import {
  restoreDatabase,
  validateRestoreTargetSafety,
  type RestoreOptions,
  type RestoreResult
} from "../../api/src/services/backup/restoreService.js";

export {
  restoreDatabase,
  validateRestoreTargetSafety,
  type RestoreOptions,
  type RestoreResult
};

// CLI entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const archiveArg = args.find((a) => a.startsWith("--archive="))?.split("=")[1];
  const targetDbArg = args.find((a) => a.startsWith("--target-db="))?.split("=")[1];
  const uriArg = args.find((a) => a.startsWith("--uri="))?.split("=")[1];
  const forceOverwrite = args.includes("--force-production-overwrite");

  if (!archiveArg) {
    console.error("Usage: tsx restore.ts --archive=<path-to-archive> [--target-db=lifeos_recovery] [--uri=...]");
    process.exit(1);
  }

  restoreDatabase({
    archivePath: path.resolve(archiveArg),
    targetDatabaseName: targetDbArg,
    mongoUri: uriArg,
    forceProductionOverwrite: forceOverwrite
  })
    .then((res) => {
      console.log(`✅ Restoration into "${res.targetDatabase}" succeeded in ${res.durationMs}ms!`);
      console.log(`- Restored collections: ${res.restoredCollections.length}`);
      console.log(`- Restored documents: ${res.totalRestoredDocuments}`);
      res.restoredCollections.forEach((c) => console.log(`  • ${c.name}: ${c.documentCount} docs`));
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Restore failed:", err);
      process.exit(1);
    });
}
