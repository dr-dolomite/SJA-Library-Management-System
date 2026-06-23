import "server-only";
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

export async function logActivity(input: AuditInput) {
  const row = buildAuditRow(input);
  await prisma.auditLog.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { ...row, metadata: row.metadata as any },
  });
}
