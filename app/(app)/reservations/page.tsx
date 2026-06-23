import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { listReservations } from "@/lib/data/reservations";
import { deriveReservationStatus } from "@/lib/reservation-status";
import { ReservationStatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookingForm, CancelButton } from "./booking-form";

export const metadata: Metadata = {
  title: "Venue reservations · SJA-LMS",
};

// "Jun 23, 2025, 9:00 AM" — shared date+time formatter for the list.
const dtLabel = (d: Date) =>
  d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// "9:00 AM – 11:00 AM" — time-only range shown in the same row as the date.
const timeLabel = (d: Date) =>
  d.toLocaleString("en-PH", { hour: "numeric", minute: "2-digit" });

export default async function ReservationsPage() {
  const reservations = await listReservations();
  const now = new Date();

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Venue reservations
        </h1>
        <p className="text-sm text-muted-foreground">
          Book the library for events and track upcoming and past reservations.
        </p>
      </div>

      <BookingForm />

      {/* Reservation list */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-medium text-foreground">All reservations</h2>
          {reservations.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              {reservations.length}{" "}
              {reservations.length === 1 ? "reservation" : "reservations"}
            </span>
          ) : null}
        </div>

        {reservations.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 p-8">
            <div className="flex max-w-sm flex-col items-center text-center">
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
              >
                <CalendarDays className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-medium text-foreground">
                No reservations yet
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                Book the library above and it will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Booked by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => {
                  const status = deriveReservationStatus(r, now);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {dtLabel(r.startsAt).split(",").slice(0, 2).join(",")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {timeLabel(r.startsAt)}
                        {" – "}
                        {timeLabel(r.endsAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.purpose ?? (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.reservedByName}
                      </TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Cancel is only meaningful for active, not-yet-elapsed bookings */}
                        {status === "booked" ? (
                          <CancelButton id={r.id} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}
