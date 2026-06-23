"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CirculationError,
  type BorrowerResolution,
  type CopyResolution,
  checkoutByQrWithAudit,
  resolveBorrowerByQr,
  resolveCopyByQr,
  returnByQrWithAudit,
} from "@/lib/data/loans";
import { libraryEndOfDay } from "@/lib/loan-status";

// The desk is interactive, so actions return a discriminated result instead of
// throwing for EXPECTED failures (bad token, copy on loan, inactive card). The
// data layer raises CirculationError for those; anything else is a real bug and
// is re-thrown to surface as a 500.
export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof CirculationError) return { ok: false, error: err.message };
  throw err;
}

const Token = z.string().trim().min(1, "Scan or type a code first.");
const CheckoutInput = z.object({
  copyQr: Token,
  cardQr: z.string().trim().min(1, "Scan the borrower card."),
  // <input type="date"> value — interpreted as end-of-day local so a book isn't
  // overdue until the due day has fully passed.
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid due date."),
});

export async function resolveCopy(
  copyQr: string,
): Promise<ActionResult<{ copy: CopyResolution }>> {
  const parsed = Token.safeParse(copyQr);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }
  try {
    return { ok: true, copy: await resolveCopyByQr(parsed.data) };
  } catch (err) {
    return fail(err);
  }
}

export async function resolveBorrower(
  cardQr: string,
): Promise<ActionResult<{ borrower: BorrowerResolution }>> {
  const parsed = Token.safeParse(cardQr);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }
  try {
    return { ok: true, borrower: await resolveBorrowerByQr(parsed.data) };
  } catch (err) {
    return fail(err);
  }
}

export async function checkout(input: {
  copyQr: string;
  cardQr: string;
  dueDate: string;
}): Promise<ActionResult<{ copyTitle: string; borrowerName: string }>> {
  const parsed = CheckoutInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }
  try {
    const { copyTitle, borrowerName } = await checkoutByQrWithAudit({
      copyQr: parsed.data.copyQr,
      cardQr: parsed.data.cardQr,
      dueAt: libraryEndOfDay(parsed.data.dueDate),
    });
    revalidatePath("/circulation");
    return { ok: true, copyTitle, borrowerName };
  } catch (err) {
    return fail(err);
  }
}

export async function returnCopy(
  copyQr: string,
): Promise<ActionResult<{ copyTitle: string; borrowerName: string }>> {
  const parsed = Token.safeParse(copyQr);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }
  try {
    const { copyTitle, borrowerName } = await returnByQrWithAudit({
      copyQr: parsed.data,
    });
    revalidatePath("/circulation");
    return { ok: true, copyTitle, borrowerName };
  } catch (err) {
    return fail(err);
  }
}
