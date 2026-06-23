import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/session";
import { auditRowForDb } from "@/lib/audit";

// Every read/write gates here — the data layer is the security boundary, not the
// UI (CLAUDE.md). Mirrors lib/data/borrowers.ts.
async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authenticated");
  return staff;
}

/**
 * An EXPECTED circulation failure (copy not found, already on loan, inactive
 * card, ...). The desk surfaces `.message` to the librarian verbatim; anything
 * that isn't a CirculationError is a real bug and bubbles as a 500.
 */
export class CirculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CirculationError";
  }
}

type CopyStatus = "available" | "borrowed" | "lost";

// ─── Read shapes ──────────────────────────────────────────────────────────────

export type CopyResolution = {
  copyId: string;
  copyQr: string;
  title: string;
  author: string | null;
  status: CopyStatus;
  /** The current open loan, when the copy is out. */
  openLoan: { borrowerName: string; borrowedAt: Date; dueAt: Date } | null;
  /** Most recent loans for this copy — the inline "copy history". */
  history: {
    id: string;
    borrowerName: string;
    borrowedAt: Date;
    dueAt: Date;
    returnedAt: Date | null;
  }[];
};

export type BorrowerResolution = {
  id: string;
  cardQr: string;
  fullName: string;
  status: "active" | "inactive";
  activeLoanCount: number;
};

export type OpenLoanRow = {
  id: string;
  copyTitle: string;
  copyQr: string;
  borrowerName: string;
  borrowerId: string;
  borrowedAt: Date;
  dueAt: Date;
};

// ─── Reads (desk lookups) ─────────────────────────────────────────────────────

/** Resolve a scanned/typed copy token to its title, live status, and history. */
export async function resolveCopyByQr(copyQr: string): Promise<CopyResolution> {
  await requireStaff();
  const copy = await prisma.bookCopy.findUnique({
    where: { copyQr },
    select: {
      id: true,
      copyQr: true,
      status: true,
      book: { select: { title: true, author: true } },
      loans: {
        orderBy: { borrowedAt: "desc" },
        take: 5,
        select: {
          id: true,
          borrowedAt: true,
          dueAt: true,
          returnedAt: true,
          borrower: { select: { fullName: true } },
        },
      },
    },
  });
  if (!copy) throw new CirculationError("No copy matches that code.");

  // Dedicated query for the open loan — must not depend on the take:5 history
  // slice, which may not include the active loan if it's outside the window.
  const open = await prisma.loan.findFirst({
    where: { copyId: copy.id, returnedAt: null },
    orderBy: { borrowedAt: "desc" },
    select: {
      borrowedAt: true,
      dueAt: true,
      borrower: { select: { fullName: true } },
    },
  });

  return {
    copyId: copy.id,
    copyQr: copy.copyQr,
    title: copy.book.title,
    author: copy.book.author,
    status: copy.status as CopyStatus,
    openLoan: open
      ? {
          borrowerName: open.borrower.fullName,
          borrowedAt: open.borrowedAt,
          dueAt: open.dueAt,
        }
      : null,
    history: copy.loans.map((l) => ({
      id: l.id,
      borrowerName: l.borrower.fullName,
      borrowedAt: l.borrowedAt,
      dueAt: l.dueAt,
      returnedAt: l.returnedAt,
    })),
  };
}

/** Resolve a scanned/typed borrower card token to the patron behind it. */
export async function resolveBorrowerByQr(cardQr: string): Promise<BorrowerResolution> {
  await requireStaff();
  const borrower = await prisma.borrower.findUnique({
    where: { cardQr },
    select: {
      id: true,
      cardQr: true,
      fullName: true,
      status: true,
      _count: { select: { loans: { where: { returnedAt: null } } } },
    },
  });
  if (!borrower) throw new CirculationError("No borrower card matches that code.");
  return {
    id: borrower.id,
    cardQr: borrower.cardQr,
    fullName: borrower.fullName,
    status: borrower.status,
    activeLoanCount: borrower._count.loans,
  };
}

/** Everything currently checked out, soonest due first (overdue floats up). */
export async function listOpenLoans(): Promise<OpenLoanRow[]> {
  await requireStaff();
  const loans = await prisma.loan.findMany({
    where: { returnedAt: null },
    orderBy: { dueAt: "asc" },
    select: {
      id: true,
      borrowedAt: true,
      dueAt: true,
      borrowerId: true,
      borrower: { select: { fullName: true } },
      copy: { select: { copyQr: true, book: { select: { title: true } } } },
    },
  });
  return loans.map((l) => ({
    id: l.id,
    copyTitle: l.copy.book.title,
    copyQr: l.copy.copyQr,
    borrowerName: l.borrower.fullName,
    borrowerId: l.borrowerId,
    borrowedAt: l.borrowedAt,
    dueAt: l.dueAt,
  }));
}

/** A borrower with their loan history — for the borrower detail view. */
export async function getBorrowerLoans(borrowerId: string) {
  await requireStaff();
  return prisma.borrower.findUnique({
    where: { id: borrowerId },
    select: {
      id: true,
      fullName: true,
      cardQr: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      loans: {
        orderBy: [{ returnedAt: { sort: "asc", nulls: "first" } }, { borrowedAt: "desc" }],
        select: {
          id: true,
          borrowedAt: true,
          dueAt: true,
          returnedAt: true,
          copy: { select: { copyQr: true, book: { select: { title: true } } } },
        },
      },
    },
  });
}

// ─── Writes (atomic borrow / return + audit, one transaction) ─────────────────

/**
 * Check a copy out to a borrower. Resolves both tokens INSIDE the transaction
 * (never trusts client-passed ids) and claims the copy with a conditional
 * update: if `updateMany(status: available)` touches 0 rows, another desk won
 * the copy first and the whole transaction aborts. This is circulation's
 * analogue of the venue gist-exclusion constraint — one state of truth enforced
 * at write time.
 */
export async function checkoutByQrWithAudit(input: {
  copyQr: string;
  cardQr: string;
  dueAt: Date;
}) {
  const staff = await requireStaff();
  return prisma.$transaction(async (tx) => {
    const copy = await tx.bookCopy.findUnique({
      where: { copyQr: input.copyQr },
      select: { id: true, status: true, book: { select: { title: true } } },
    });
    if (!copy) throw new CirculationError("No copy matches that code.");
    if (copy.status === "lost") {
      throw new CirculationError("This copy is marked lost and can't be checked out.");
    }

    const borrower = await tx.borrower.findUnique({
      where: { cardQr: input.cardQr },
      select: { id: true, fullName: true, status: true },
    });
    if (!borrower) throw new CirculationError("No borrower card matches that code.");
    if (borrower.status !== "active") {
      throw new CirculationError("This borrower's card is inactive.");
    }

    // Server-side past-due guard — enforced at the security boundary, not
    // just in the UI, so the client can't submit a stale or tampered due date.
    if (input.dueAt.getTime() < Date.now()) {
      throw new CirculationError("Due date must be today or later.");
    }

    // Atomic claim — the guard against a double checkout from two desks.
    const claimed = await tx.bookCopy.updateMany({
      where: { id: copy.id, status: "available" },
      data: { status: "borrowed" },
    });
    if (claimed.count === 0) {
      const holder = await tx.loan.findFirst({
        where: { copyId: copy.id, returnedAt: null },
        select: { borrower: { select: { fullName: true } } },
      });
      throw new CirculationError(
        holder
          ? `This copy is already on loan to ${holder.borrower.fullName}.`
          : "This copy isn't available to check out.",
      );
    }

    const loan = await tx.loan.create({
      data: {
        copyId: copy.id,
        borrowerId: borrower.id,
        borrowedBy: staff.id,
        dueAt: input.dueAt,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: auditRowForDb({
        actor: staff.id,
        action: "loan.checkout",
        entityType: "loan",
        entityId: loan.id,
        metadata: {
          copyQr: input.copyQr,
          copyTitle: copy.book.title,
          borrowerId: borrower.id,
          borrowerName: borrower.fullName,
          dueAt: input.dueAt.toISOString(),
        },
      }),
    });
    return {
      loanId: loan.id,
      copyTitle: copy.book.title,
      borrowerName: borrower.fullName,
    };
  });
}

/**
 * Return a copy by its token. Finds the one open loan, closes it (stamping who
 * took it back and when), and frees the copy — atomically, with an audit row.
 */
export async function returnByQrWithAudit(input: { copyQr: string }) {
  const staff = await requireStaff();
  return prisma.$transaction(async (tx) => {
    const copy = await tx.bookCopy.findUnique({
      where: { copyQr: input.copyQr },
      select: { id: true, status: true, book: { select: { title: true } } },
    });
    if (!copy) throw new CirculationError("No copy matches that code.");
    if (copy.status === "lost") {
      throw new CirculationError(
        "This copy is marked lost — resolve its status before returning.",
      );
    }

    const loan = await tx.loan.findFirst({
      where: { copyId: copy.id, returnedAt: null },
      orderBy: { borrowedAt: "desc" },
      select: { id: true, borrower: { select: { id: true, fullName: true } } },
    });
    if (!loan) throw new CirculationError("This copy isn't checked out.");

    await tx.loan.update({
      where: { id: loan.id },
      data: { returnedAt: new Date(), returnedTo: staff.id },
    });
    await tx.bookCopy.update({
      where: { id: copy.id },
      data: { status: "available" },
    });
    await tx.auditLog.create({
      data: auditRowForDb({
        actor: staff.id,
        action: "loan.return",
        entityType: "loan",
        entityId: loan.id,
        metadata: {
          copyQr: input.copyQr,
          copyTitle: copy.book.title,
          borrowerId: loan.borrower.id,
          borrowerName: loan.borrower.fullName,
        },
      }),
    });
    return {
      loanId: loan.id,
      copyTitle: copy.book.title,
      borrowerName: loan.borrower.fullName,
    };
  });
}
