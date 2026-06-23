import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/session";

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

export async function insertBorrower(input: {
  cardQr: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}) {
  await requireStaff();
  return prisma.borrower.create({ data: input, select: { id: true } });
}
