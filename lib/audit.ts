import "server-only";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditInput = {
  actor: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

// Pure builder — unit-testable without a DB. Field names match the Prisma model.
export function buildAuditRow(input: AuditInput) {
  return {
    actor: input.actor,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };
}

// DB-shaped row: narrows metadata to Prisma's JSON input type (no `any`).
export function auditRowForDb(input: AuditInput): Prisma.AuditLogUncheckedCreateInput {
  const row = buildAuditRow(input);
  return { ...row, metadata: row.metadata as Prisma.InputJsonValue };
}

export async function logActivity(input: AuditInput) {
  await prisma.auditLog.create({ data: auditRowForDb(input) });
}
