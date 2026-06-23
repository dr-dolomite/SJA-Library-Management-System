// Loan state is DERIVED, never stored — `loans` has no status column. A loan is
// open while `returnedAt` is null; an open loan is overdue once `dueAt` has
// passed. Keeping the derivation here (pure, no DB, no `server-only`) lets the UI
// and the data layer agree on one definition and keeps it unit-testable — the
// same shape as `lib/qr.ts` / `lib/audit.ts`.

/** Default loan period, in days, applied when checking a copy out. */
export const DEFAULT_LOAN_DAYS = 14;

/** The library operates in Asia/Manila — fixed UTC+8, no DST — so a literal
 *  offset anchors "end of the library's day" unambiguously regardless of the
 *  server's timezone. */
export const LIBRARY_UTC_OFFSET = "+08:00";

/** End-of-day (23:59:59) in the library's timezone for a yyyy-mm-dd string,
 *  as an absolute instant. */
export function libraryEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59${LIBRARY_UTC_OFFSET}`);
}

export type LoanStatus = "on_loan" | "overdue" | "returned";

/** The minimal shape needed to derive status — satisfied by a Prisma `Loan`. */
export type LoanLike = {
  dueAt: Date;
  returnedAt: Date | null;
};

/**
 * Derive a loan's status from its dates. `now` is injected so callers (and
 * tests) control "today"; it defaults to the current time.
 */
export function deriveLoanStatus(loan: LoanLike, now: Date = new Date()): LoanStatus {
  if (loan.returnedAt) return "returned";
  return loan.dueAt.getTime() < now.getTime() ? "overdue" : "on_loan";
}

/** Whether an open loan is past due. Returned loans are never overdue. */
export function isOverdue(loan: LoanLike, now: Date = new Date()): boolean {
  return deriveLoanStatus(loan, now) === "overdue";
}

/**
 * The due date for a checkout starting at `from`, `days` later. Pure date math
 * (adds whole days); the time-of-day rides along from `from`.
 */
export function computeDueAt(from: Date, days: number = DEFAULT_LOAN_DAYS): Date {
  const due = new Date(from);
  due.setDate(due.getDate() + days);
  return due;
}

/** Human label + the design's status vocabulary. Status is never color-only. */
export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  on_loan: "On loan",
  overdue: "Overdue",
  returned: "Returned",
};
