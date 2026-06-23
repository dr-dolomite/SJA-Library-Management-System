import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/session";
import { auditRowForDb } from "@/lib/audit";

// Every read/write gates here — the data layer is the security boundary, not
// the UI (CLAUDE.md). Mirrors lib/data/loans.ts.
async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authenticated");
  return staff;
}

/**
 * An EXPECTED venue failure (slot conflict, reservation not found, bad cancel
 * target, ...). The desk surfaces `.message` to the librarian verbatim;
 * anything that isn't a VenueError is a real bug and bubbles as a 500.
 */
export class VenueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VenueError";
  }
}

// ─── Read shapes ──────────────────────────────────────────────────────────────

export type ReservationRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "booked" | "cancelled" | "completed";
  purpose: string | null;
  reservedByName: string;
};

// ─── Reads ────────────────────────────────────────────────────────────────────

/** All reservations, most recent first. */
export async function listReservations(): Promise<ReservationRow[]> {
  await requireStaff();
  const rows = await prisma.venueReservation.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      purpose: true,
      reservedByUser: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    status: r.status as ReservationRow["status"],
    purpose: r.purpose,
    reservedByName: r.reservedByUser.name,
  }));
}

// ─── Writes (atomic create / cancel + audit, one transaction) ─────────────────

/**
 * Book the venue for a time range. Retroactive bookings (past start times) are
 * allowed — staff may need to record a session after the fact. Only the
 * end-after-start invariant is enforced here; the DB gist exclusion constraint
 * (`venue_no_overlap`) guards against double-booking at the database level.
 */
export async function createReservationWithAudit(input: {
  startsAt: Date;
  endsAt: Date;
  purpose: string | null;
}) {
  const staff = await requireStaff();

  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    throw new VenueError("End time must be after the start time.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.venueReservation.create({
        data: {
          reservedBy: staff.id,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          purpose: input.purpose,
          // status defaults to booked via the schema default
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: auditRowForDb({
          actor: staff.id,
          action: "venue.book",
          entityType: "venue_reservation",
          entityId: reservation.id,
          metadata: {
            startsAt: input.startsAt.toISOString(),
            endsAt: input.endsAt.toISOString(),
            purpose: input.purpose,
          },
        }),
      });

      return {
        reservationId: reservation.id,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      };
    });
  } catch (err) {
    // Translate the gist exclusion violation into a user-surfaceable message.
    if (
      String(err).includes("venue_no_overlap") ||
      String(err).includes("23P01")
    ) {
      throw new VenueError("That time slot is already booked.");
    }
    throw err;
  }
}

/**
 * Cancel an active booking. Only `booked` reservations can be cancelled;
 * completed or already-cancelled reservations are rejected with a clear message.
 * Cancelling frees the slot immediately (the gist exclusion constraint applies a
 * WHERE status = 'booked' predicate, so cancelled rows are invisible to it).
 */
export async function cancelReservationWithAudit(id: string) {
  const staff = await requireStaff();

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.venueReservation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!reservation) throw new VenueError("Reservation not found.");
    if (reservation.status !== "booked") {
      throw new VenueError("Only an active booking can be cancelled.");
    }

    await tx.venueReservation.update({
      where: { id },
      data: { status: "cancelled" },
    });

    await tx.auditLog.create({
      data: auditRowForDb({
        actor: staff.id,
        action: "venue.cancel",
        entityType: "venue_reservation",
        entityId: id,
      }),
    });

    return { reservationId: id };
  });
}
