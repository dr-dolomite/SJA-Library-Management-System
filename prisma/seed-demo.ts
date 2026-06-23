/**
 * Demo / development seed for the Circulation slice.
 *
 * Seeds a small catalog (books + physical copies, each minting a `cpy_…`
 * token), a few borrowers (each with a `brw_…` card), and a couple of live
 * loans — one current, one overdue — so the circulation desk and its tables
 * have real content to work against before the Catalog slice ships its own
 * copy-creation + QR-label flow.
 *
 * Run with:  pnpm db:seed:demo
 * Idempotent at the coarse level: if any book already exists, it does nothing.
 */
import { config } from "dotenv";

// Load env BEFORE the prisma chain — lib/prisma builds its pg adapter from
// DATABASE_URL at module-eval time (see prisma/seed.ts for the same dance).
config({ path: ".env.local" });

const CATALOG: { title: string; author: string; copies: number }[] = [
  { title: "Noli Me Tángere", author: "José Rizal", copies: 3 },
  { title: "El Filibusterismo", author: "José Rizal", copies: 2 },
  { title: "Florante at Laura", author: "Francisco Balagtas", copies: 2 },
  { title: "The Woman Who Had Two Navels", author: "Nick Joaquin", copies: 1 },
  { title: "Dekada '70", author: "Lualhati Bautista", copies: 2 },
];

const BORROWERS: { fullName: string; email: string | null }[] = [
  { fullName: "Maria Santos", email: "maria.santos@example.com" },
  { fullName: "Jose dela Cruz", email: null },
  { fullName: "Andrea Reyes", email: "andrea.reyes@example.com" },
];

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const { prisma } = await import("@/lib/prisma");
  const { newCardToken, newCopyToken } = await import("@/lib/qr");

  if ((await prisma.book.count()) > 0) {
    console.log("• Catalog already seeded — nothing to do.");
    return;
  }

  // Loans need a staff actor (borrowedBy → user). Use the seeded admin.
  const staff = await prisma.user.findFirst({ select: { id: true } });

  const borrowers = await Promise.all(
    BORROWERS.map((b) =>
      prisma.borrower.create({
        data: { cardQr: newCardToken(), fullName: b.fullName, email: b.email },
        select: { id: true, fullName: true },
      }),
    ),
  );

  const createdCopies: { id: string; copyQr: string; title: string }[] = [];
  for (const entry of CATALOG) {
    const book = await prisma.book.create({
      data: { title: entry.title, author: entry.author },
      select: { id: true, title: true },
    });
    for (let i = 0; i < entry.copies; i++) {
      const copy = await prisma.bookCopy.create({
        data: { bookId: book.id, copyQr: newCopyToken() },
        select: { id: true, copyQr: true },
      });
      createdCopies.push({ ...copy, title: book.title });
    }
  }

  // Two live loans so the desk shows state immediately: one healthy, one overdue.
  if (staff && createdCopies.length >= 2) {
    const now = new Date();
    const [current, overdue] = createdCopies;

    await prisma.$transaction([
      prisma.loan.create({
        data: {
          copyId: current.id,
          borrowerId: borrowers[0].id,
          borrowedBy: staff.id,
          borrowedAt: addDays(now, -3),
          dueAt: addDays(now, 11),
        },
      }),
      prisma.bookCopy.update({
        where: { id: current.id },
        data: { status: "borrowed" },
      }),
      prisma.loan.create({
        data: {
          copyId: overdue.id,
          borrowerId: borrowers[1].id,
          borrowedBy: staff.id,
          borrowedAt: addDays(now, -30),
          dueAt: addDays(now, -2),
        },
      }),
      prisma.bookCopy.update({
        where: { id: overdue.id },
        data: { status: "borrowed" },
      }),
    ]);
  } else if (!staff) {
    console.log("• No staff user found — seeded catalog only (run `pnpm db:seed` first for live loans).");
  }

  console.log(
    `✓ Seeded ${CATALOG.length} titles, ${createdCopies.length} copies, ${borrowers.length} borrowers.`,
  );
  console.log("  Sample copy tokens (scan these at the desk):");
  for (const c of createdCopies.slice(0, 4)) {
    console.log(`    ${c.copyQr}  ${c.title}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Demo seed failed:", err);
    process.exit(1);
  });
