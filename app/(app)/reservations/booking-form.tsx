"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookVenue, cancelReservation } from "./actions";

// yyyy-mm-dd in LOCAL time — avoids the UTC-shift toISOString() introduces.
function todayInputValue(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

// e.g. "2025-06-23" + "09:00" → "Jun 23, 2025, 9:00 AM"
function formatDateTime(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Book form ────────────────────────────────────────────────────────────────

export function BookingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [date, setDate] = useState(todayInputValue);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Client-side guard: date + both times must be present and endTime > startTime.
  const canSubmit =
    date.length > 0 &&
    startTime.length > 0 &&
    endTime.length > 0 &&
    endTime > startTime;

  const startId = "booking-start-time";
  const endId = "booking-end-time";
  const dateId = "booking-date";
  const purposeId = "booking-purpose";
  const errorId = "booking-error";

  function reset() {
    setDate(todayInputValue());
    setStartTime("08:00");
    setEndTime("10:00");
    setPurpose("");
    setError(null);
  }

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const res = await bookVenue({ date, startTime, endTime, purpose });
      if (res.ok) {
        toast.success("Library booked", {
          description: `${formatDateTime(date, startTime)} – ${formatDateTime(date, endTime)}`,
        });
        reset();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-4">
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={dateId}>
              <CalendarDays aria-hidden className="mr-1 inline size-3.5 text-muted-foreground" />
              Date
            </Label>
            <Input
              id={dateId}
              type="date"
              value={date}
              disabled={pending}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => { setDate(e.target.value); setError(null); }}
              className="w-40"
            />
          </div>

          {/* Start time */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={startId}>Start time</Label>
            <Input
              id={startId}
              type="time"
              value={startTime}
              disabled={pending}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => { setStartTime(e.target.value); setError(null); }}
              className="w-32"
            />
          </div>

          {/* End time */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={endId}>End time</Label>
            <Input
              id={endId}
              type="time"
              value={endTime}
              disabled={pending}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => { setEndTime(e.target.value); setError(null); }}
              className="w-32"
            />
          </div>

          {/* Purpose (optional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={purposeId}>Purpose (optional)</Label>
            <Input
              id={purposeId}
              type="text"
              value={purpose}
              placeholder="Faculty meeting"
              disabled={pending}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-56"
            />
          </div>
        </div>

        {/* Inline error — surfaced from the server action */}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <TriangleAlert aria-hidden className="size-3.5" />
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end border-t border-border px-4 py-3">
        <Button
          onClick={submit}
          disabled={!canSubmit || pending}
          className="min-w-36"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarDays className="size-4" />
          )}
          Book library
        </Button>
      </div>
    </div>
  );
}

// ─── Cancel button (thin client shell — just the interactive button) ──────────

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("Cancel this reservation? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await cancelReservation(id);
      if (res.ok) {
        toast.success("Reservation cancelled.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handleCancel}
      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
    >
      {pending ? (
        <Loader2 aria-hidden className="size-3 animate-spin" />
      ) : (
        <X aria-hidden className="size-3" />
      )}
      Cancel
    </Button>
  );
}
