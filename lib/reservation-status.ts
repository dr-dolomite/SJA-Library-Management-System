// Reservation status is PARTIALLY DERIVED — `completed` is never stored for
// past bookings; it is inferred at read time from `endsAt`. `cancelled` is
// stored explicitly (a staff action). `booked` means active and not yet ended.
// Keeping the derivation here (pure, no DB, no `server-only`) lets the UI and
// the data layer agree on one definition — the same shape as `lib/loan-status.ts`.

import { LIBRARY_UTC_OFFSET } from "./loan-status";

export type ReservationStatus = "booked" | "cancelled" | "completed";

/** The minimal shape needed to derive status — satisfied by a Prisma `VenueReservation`. */
export type ReservationLike = {
  status: "booked" | "cancelled" | "completed";
  endsAt: Date;
};

/**
 * Derive a reservation's display status. `completed` is DERIVED from `endsAt`
 * and is never stored — mirroring how loan overdue is derived from `dueAt`.
 * `now` is injected so callers (and tests) control "today".
 *
 * Boundary: at the exact instant `endsAt === now` the slot has not yet
 * elapsed (`<` is strict), so status is still "booked". One millisecond
 * later it becomes "completed".
 */
export function deriveReservationStatus(
  r: ReservationLike,
  now: Date = new Date(),
): ReservationStatus {
  if (r.status === "cancelled") return "cancelled";
  if (r.status === "completed") return "completed";
  return r.endsAt.getTime() < now.getTime() ? "completed" : "booked";
}

/** Human label + the design's status vocabulary. Status is never color-only. */
export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  booked: "Booked",
  cancelled: "Cancelled",
  completed: "Completed",
};

/**
 * Assemble a Manila-anchored instant from a date string and a time string.
 * Anchoring to the library's UTC+8 timezone ensures the stored TIMESTAMPTZ is
 * correct regardless of the server's own timezone setting.
 *
 * @param dateStr - yyyy-mm-dd
 * @param timeStr - HH:mm (24-hour)
 */
export function libraryDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00${LIBRARY_UTC_OFFSET}`);
}
