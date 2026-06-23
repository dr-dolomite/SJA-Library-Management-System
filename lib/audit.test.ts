import { describe, it, expect } from "vitest";
import { buildAuditRow } from "./audit";

describe("buildAuditRow", () => {
  it("defaults entity fields to null and metadata to an empty object", () => {
    const row = buildAuditRow({ actor: "a", action: "borrower.create" });
    expect(row).toEqual({
      actor: "a",
      action: "borrower.create",
      entityType: null,
      entityId: null,
      metadata: {},
    });
  });

  it("passes through entity and metadata", () => {
    const row = buildAuditRow({
      actor: "a",
      action: "borrower.create",
      entityType: "borrower",
      entityId: "b1",
      metadata: { name: "X" },
    });
    expect(row.entityType).toBe("borrower");
    expect(row.entityId).toBe("b1");
    expect(row.metadata).toEqual({ name: "X" });
  });
});
