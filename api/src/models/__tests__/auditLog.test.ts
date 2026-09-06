import { describe, it, expect } from "vitest";
import { AuditLog } from "../AuditLog.js";

describe("AuditLog Model & Tamper Resistance", () => {
  it("validates valid audit log document structure", () => {
    const doc = new AuditLog({
      action: "USER_LOOKUP",
      resourceType: "user",
      actorRole: "admin",
      outcome: "SUCCESS",
      expiresAt: new Date(Date.now() + 90 * 86400000)
    });

    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.timestamp).toBeInstanceOf(Date);
    expect(doc.metadata).toBeDefined();
  });

  it("fails validation if required fields are missing", () => {
    const doc = new AuditLog({});
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors.action).toBeDefined();
    expect(err?.errors.resourceType).toBeDefined();
    expect(err?.errors.outcome).toBeDefined();
    expect(err?.errors.expiresAt).toBeDefined();
  });

  it("prevents update operations with tamper-resistance hook", async () => {
    await expect(AuditLog.updateOne({ action: "test" }, { action: "tampered" })).rejects.toThrow(
      /TamperResistance: AuditLog records are immutable/
    );

    await expect(AuditLog.updateMany({ action: "test" }, { action: "tampered" })).rejects.toThrow(
      /TamperResistance: AuditLog records are immutable/
    );

    await expect(AuditLog.findOneAndUpdate({ action: "test" }, { action: "tampered" })).rejects.toThrow(
      /TamperResistance: AuditLog records are immutable/
    );

    await expect(AuditLog.replaceOne({ action: "test" }, { action: "tampered" })).rejects.toThrow(
      /TamperResistance: AuditLog records are immutable/
    );
  });

  it("prevents direct deletion operations with tamper-resistance hook", async () => {
    await expect(AuditLog.deleteOne({ action: "test" })).rejects.toThrow(
      /TamperResistance: AuditLog records cannot be deleted/
    );

    await expect(AuditLog.deleteMany({ action: "test" })).rejects.toThrow(
      /TamperResistance: AuditLog records cannot be deleted/
    );

    await expect(AuditLog.findOneAndDelete({ action: "test" })).rejects.toThrow(
      /TamperResistance: AuditLog records cannot be deleted/
    );
  });
});
