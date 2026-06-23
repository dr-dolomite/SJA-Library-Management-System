import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/session";
import { auditRowForDb } from "@/lib/audit";

// Every read/write gates here — the data layer is the security boundary.
async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authenticated");
  return staff;
}

export async function listBorrowers() {
  await requireStaff();
  return prisma.borrower.findMany({
    select: { id: true, cardQr: true, fullName: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

// Borrower + its audit entry commit together or not at all — the reference
// write+audit shape every later module copies.
export async function createBorrowerWithAudit(input: {
  cardQr: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}) {
  const staff = await requireStaff();
  return prisma.$transaction(async (tx) => {
    const borrower = await tx.borrower.create({
      data: {
        cardQr: input.cardQr,
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: auditRowForDb({
        actor: staff.id,
        action: "borrower.create",
        entityType: "borrower",
        entityId: borrower.id,
        metadata: { fullName: input.fullName },
      }),
    });
    return borrower;
  });
}
