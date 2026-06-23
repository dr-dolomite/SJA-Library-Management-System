import { describe, it, expect } from "vitest";
import {
  deriveReservationStatus,
  libraryDateTime,
} from "./reservation-status";

const NOW = new Date("2026-06-23T09:00:00.000Z");

describe("deriveReservationStatus", () => {
  it("is cancelled when status is cancelled, even if endsAt is in the future", () => {
    const r = {
      status: "cancelled" as const,
      endsAt: new Date("2026-07-01T00:00:00.000Z"),
    };
    expect(deriveReservationStatus(r, NOW)).toBe("cancelled");
  });

  it("is completed when status is completed (stored explicitly)", () => {
    const r = {
      status: "completed" as const,
      endsAt: new Date("2026-07-01T00:00:00.000Z"),
    };
    expect(deriveReservationStatus(r, NOW)).toBe("completed");
  });

  it("derives completed when booked but endsAt is in the past", () => {
    const r = {
      status: "booked" as const,
      endsAt: new Date("2026-06-22T00:00:00.000Z"), // yesterday
    };
    expect(deriveReservationStatus(r, NOW)).toBe("completed");
  });

  it("is booked when booked and endsAt is in the future", () => {
    const r = {
      status: "booked" as const,
      endsAt: new Date("2026-07-01T00:00:00.000Z"),
    };
    expect(deriveReservationStatus(r, NOW)).toBe("booked");
  });

  it("is booked at the exact endsAt boundary (strict < means not yet elapsed)", () => {
    // endsAt === now → NOT past, so status remains "booked"
    const r = { status: "booked" as const, endsAt: NOW };
    expect(deriveReservationStatus(r, NOW)).toBe("booked");
  });

  it("derives completed one millisecond past endsAt", () => {
    const r = {
      status: "booked" as const,
      endsAt: new Date(NOW.getTime() - 1),
    };
    expect(deriveReservationStatus(r, NOW)).toBe("completed");
  });
});

describe("libraryDateTime", () => {
  it("anchors 14:00 UTC+8 — equals 06:00 UTC", () => {
    expect(libraryDateTime("2026-06-30", "14:00").toISOString()).toBe(
      "2026-06-30T06:00:00.000Z",
    );
  });

  it("anchors 08:00 UTC+8 — equals 00:00 UTC", () => {
    expect(libraryDateTime("2026-06-30", "08:00").toISOString()).toBe(
      "2026-06-30T00:00:00.000Z",
    );
  });

  it("anchors midnight UTC+8 — equals 16:00 UTC the previous day", () => {
    expect(libraryDateTime("2026-06-30", "00:00").toISOString()).toBe(
      "2026-06-29T16:00:00.000Z",
    );
  });
});
