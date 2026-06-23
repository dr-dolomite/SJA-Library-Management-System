"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  VenueError,
  createReservationWithAudit,
  cancelReservationWithAudit,
} from "@/lib/data/reservations";
import { libraryDateTime } from "@/lib/reservation-status";

// The form is interactive, so actions return a discriminated result instead of
// throwing for EXPECTED failures (overlap, bad range, reservation not found).
// The data layer raises VenueError for those; anything else is a real bug and
// is re-thrown to surface as a 500.
export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// Payload-free success variant — for actions that return nothing beyond ok/error.
export type EmptyResult = { ok: true } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof VenueError) return { ok: false, error: err.message };
  throw err;
}

const BookingInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a valid start time."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a valid end time."),
  // Empty string → null; optionally trimmed.
  purpose: z.string().trim().optional(),
});

export async function bookVenue(input: {
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}): Promise<ActionResult<{ startsAt: Date; endsAt: Date }>> {
  const parsed = BookingInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]!.message };
  }

  const { date, startTime, endTime, purpose } = parsed.data;
  const startsAt = libraryDateTime(date, startTime);
  const endsAt = libraryDateTime(date, endTime);

  try {
    await createReservationWithAudit({
      startsAt,
      endsAt,
      purpose: purpose?.trim() || null,
    });
    revalidatePath("/reservations");
    return { ok: true, startsAt, endsAt };
  } catch (err) {
    return fail(err);
  }
}

export async function cancelReservation(id: string): Promise<EmptyResult> {
  if (!id || typeof id !== "string") {
    return { ok: false, error: "Invalid reservation ID." };
  }
  // Guard against malformed ids reaching Prisma (P2023 → unhandled 500).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, error: "Invalid reservation ID." };
  }
  try {
    await cancelReservationWithAudit(id);
    revalidatePath("/reservations");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
