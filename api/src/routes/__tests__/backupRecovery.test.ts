import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import {
  backupConfig,
  BackupManifestSchema,
  type BackupManifest
} from "../../services/backup/backupConfig.js";
import {
  computeFileSha256,
  encryptFileAesGcm,
  decryptFileAesGcm,
  pruneOldBackups
} from "../../services/backup/backupService.js";
import { validateRestoreTargetSafety } from "../../services/backup/restoreService.js";

describe("Database Backup & Recovery Suite (NFR-3.3)", () => {
  describe("Backup Configuration & Schema Validation", () => {
    it("defines valid default retention and safety parameters", () => {
      expect(backupConfig.defaultDatabaseName).toBe("lifeos");
      expect(backupConfig.defaultRecoveryDatabaseName).toBe("lifeos_recovery");
      expect(backupConfig.retention.dailyDays).toBe(7);
      expect(backupConfig.retention.weeklyDays).toBe(28);
      expect(backupConfig.retention.monthlyDays).toBe(365);
      expect(backupConfig.safety.prohibitedProductionNames).toContain("lifeos_prod");
      expect(backupConfig.safety.prohibitedProductionNames).toContain("lifeos_production");
    });

    it("validates a compliant backup manifest", () => {
      const validManifest: BackupManifest = {
        id: "backup_test_123",
        databaseName: "lifeos",
        createdAt: new Date().toISOString(),
        archiveFileName: "backup_test_123.dump.gz",
        archiveSizeBytes: 10240,
        sha256Hash: "a".repeat(64),
        collections: [
          { name: "users", documentCount: 5 },
          { name: "notes", documentCount: 12 }
        ],
        totalDocuments: 17,
        isEncrypted: false,
        compression: "gzip",
        environment: "test",
        pitrWindow: {
          snapshotTimestamp: new Date().toISOString()
        }
      };

      const parsed = BackupManifestSchema.safeParse(validManifest);
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid manifests with malformed hashes or missing fields", () => {
      const invalidManifest = {
        id: "backup_bad",
        // databaseName missing
        archiveFileName: "bad.dump.gz",
        sha256Hash: "short-hash", // not 64 chars
        totalDocuments: -1
      };

      const parsed = BackupManifestSchema.safeParse(invalidManifest);
      expect(parsed.success).toBe(false);
    });
  });

  describe("Restore Target Safety & Production Guardrails", () => {
    it("blocks restoration to prohibited production database names without override", () => {
      expect(() => {
        validateRestoreTargetSafety("lifeos_prod", false, false);
      }).toThrow(/CRITICAL SAFETY VIOLATION/i);

      expect(() => {
        validateRestoreTargetSafety("lifeos_production", false, false);
      }).toThrow(/CRITICAL SAFETY VIOLATION/i);
    });

    it("blocks restoration in production environment without explicit flag", () => {
      expect(() => {
        validateRestoreTargetSafety("any_db", true, false);
      }).toThrow(/CRITICAL SAFETY VIOLATION/i);
    });

    it("allows restoration to isolated recovery database in non-production", () => {
      expect(() => {
        validateRestoreTargetSafety("lifeos_recovery", false, false);
      }).not.toThrow();

      expect(() => {
        validateRestoreTargetSafety("lifeos_pitr_recovery", false, false);
      }).not.toThrow();
    });

    it("permits restoration to production when explicit override flag is supplied", () => {
      expect(() => {
        validateRestoreTargetSafety("lifeos_prod", true, true);
      }).not.toThrow();
    });
  });

  describe("Cryptographic Integrity & AES-256-GCM Encryption Round-Trip", () => {
    const tempDir = path.join(os.tmpdir(), `lifeos_backup_test_${Date.now()}`);
    const keyHex = crypto.randomBytes(32).toString("hex");

    beforeAll(async () => {
      await fs.promises.mkdir(tempDir, { recursive: true });
    });

    afterAll(async () => {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("correctly computes SHA-256 hash of a file", async () => {
      const sampleFile = path.join(tempDir, "sample.txt");
      const content = "LifeOS Mission Critical Database Backup Content 2026";
      await fs.promises.writeFile(sampleFile, content, "utf-8");

      const expectedHash = crypto.createHash("sha256").update(content).digest("hex");
      const actualHash = await computeFileSha256(sampleFile);

      expect(actualHash).toBe(expectedHash);
    });

    it("encrypts and decrypts backup payload using AES-256-GCM with authentication tag", async () => {
      const plainFile = path.join(tempDir, "plain.bson");
      const encFile = path.join(tempDir, "plain.bson.enc");
      const decFile = path.join(tempDir, "plain.dec.bson");

      const rawData = Buffer.from("High sensitivity user and financial database records");
      await fs.promises.writeFile(plainFile, rawData);

      // Encrypt
      await encryptFileAesGcm(plainFile, encFile, keyHex);
      expect(fs.existsSync(encFile)).toBe(true);

      const encContent = await fs.promises.readFile(encFile);
      // Ciphertext should not match plaintext
      expect(encContent.includes(rawData)).toBe(false);

      // Decrypt
      await decryptFileAesGcm(encFile, decFile, keyHex);
      const decContent = await fs.promises.readFile(decFile);

      expect(decContent.toString("utf-8")).toBe(rawData.toString("utf-8"));
    });

    it("fails decryption if encryption key or auth tag is corrupted", async () => {
      const plainFile = path.join(tempDir, "plain_corrupt.bson");
      const encFile = path.join(tempDir, "plain_corrupt.bson.enc");
      const decFile = path.join(tempDir, "plain_corrupt.dec.bson");

      await fs.promises.writeFile(plainFile, "Sensitive Payload");
      await encryptFileAesGcm(plainFile, encFile, keyHex);

      const wrongKeyHex = crypto.randomBytes(32).toString("hex");
      await expect(decryptFileAesGcm(encFile, decFile, wrongKeyHex)).rejects.toThrow();
    });
  });

  describe("Retention Pruning Logic", () => {
    const pruneDir = path.join(os.tmpdir(), `lifeos_prune_test_${Date.now()}`);

    beforeAll(async () => {
      await fs.promises.mkdir(pruneDir, { recursive: true });
    });

    afterAll(async () => {
      if (fs.existsSync(pruneDir)) {
        await fs.promises.rm(pruneDir, { recursive: true, force: true });
      }
    });

    it("retains snapshots within limit and prunes oldest files exceeding maxSnapshots", async () => {
      // Create 5 fake snapshots with manifests
      for (let i = 1; i <= 5; i++) {
        const manifestName = `backup_${i}.manifest.json`;
        const archiveName = `backup_${i}.dump.gz`;
        const fakeDate = new Date(Date.now() - (10 - i) * 86400000).toISOString();

        const manifest = {
          id: `backup_${i}`,
          databaseName: "lifeos",
          createdAt: fakeDate,
          archiveFileName: archiveName,
          archiveSizeBytes: 1000,
          sha256Hash: "b".repeat(64),
          collections: [],
          totalDocuments: 10,
          isEncrypted: false,
          compression: "gzip"
        };

        await fs.promises.writeFile(path.join(pruneDir, manifestName), JSON.stringify(manifest));
        await fs.promises.writeFile(path.join(pruneDir, archiveName), "fake archive content");
      }

      // Max snapshots allowed is 3 -> should prune the 2 oldest (backup_1, backup_2)
      const pruned = await pruneOldBackups(pruneDir, 3);
      expect(pruned.length).toBe(4); // 2 manifests + 2 archive files

      const remainingFiles = await fs.promises.readdir(pruneDir);
      expect(remainingFiles).not.toContain("backup_1.manifest.json");
      expect(remainingFiles).not.toContain("backup_2.manifest.json");
      expect(remainingFiles).toContain("backup_3.manifest.json");
      expect(remainingFiles).toContain("backup_4.manifest.json");
      expect(remainingFiles).toContain("backup_5.manifest.json");
    });
  });
});
