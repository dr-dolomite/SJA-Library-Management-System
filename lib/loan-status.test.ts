import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOAN_DAYS,
  computeDueAt,
  deriveLoanStatus,
  isOverdue,
  libraryEndOfDay,
} from "./loan-status";

const NOW = new Date("2026-06-23T09:00:00.000Z");

describe("deriveLoanStatus", () => {
  it("is returned when returnedAt is set, regardless of due date", () => {
    const loan = {
      dueAt: new Date("2026-06-01T00:00:00.000Z"), // long past due
      returnedAt: new Date("2026-06-20T00:00:00.000Z"),
    };
    expect(deriveLoanStatus(loan, NOW)).toBe("returned");
  });

  it("is on_loan when open and due in the future", () => {
    const loan = { dueAt: new Date("2026-07-01T00:00:00.000Z"), returnedAt: null };
    expect(deriveLoanStatus(loan, NOW)).toBe("on_loan");
  });

  it("is overdue when open and past due", () => {
    const loan = { dueAt: new Date("2026-06-22T00:00:00.000Z"), returnedAt: null };
    expect(deriveLoanStatus(loan, NOW)).toBe("overdue");
  });

  it("treats the exact due instant as still on loan (not yet overdue)", () => {
    const loan = { dueAt: NOW, returnedAt: null };
    expect(deriveLoanStatus(loan, NOW)).toBe("on_loan");
  });
});

describe("isOverdue", () => {
  it("is false for a returned loan even if returned late", () => {
    const loan = {
      dueAt: new Date("2026-06-01T00:00:00.000Z"),
      returnedAt: new Date("2026-06-20T00:00:00.000Z"),
    };
    expect(isOverdue(loan, NOW)).toBe(false);
  });

  it("is true for an open, past-due loan", () => {
    const loan = { dueAt: new Date("2026-06-22T00:00:00.000Z"), returnedAt: null };
    expect(isOverdue(loan, NOW)).toBe(true);
  });

  it("is false at the exact due boundary (dueAt === now)", () => {
    const loan = { dueAt: NOW, returnedAt: null };
    expect(isOverdue(loan, NOW)).toBe(false);
  });
});

describe("computeDueAt", () => {
  it("adds the default loan period when days is omitted", () => {
    const due = computeDueAt(NOW);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + DEFAULT_LOAN_DAYS);
    expect(due.getTime()).toBe(expected.getTime());
  });

  it("adds the given number of days and preserves time of day", () => {
    const due = computeDueAt(NOW, 7);
    expect(due.toISOString()).toBe("2026-06-30T09:00:00.000Z");
  });

  it("does not mutate the input date", () => {
    const from = new Date(NOW);
    computeDueAt(from, 5);
    expect(from.getTime()).toBe(NOW.getTime());
  });

  it("rolls over the month correctly (Jan 25 + 14 = Feb 8)", () => {
    const from = new Date("2026-01-25T09:00:00.000Z");
    const due = computeDueAt(from, 14);
    expect(due.toISOString().slice(0, 10)).toBe("2026-02-08");
  });

  it("rolls over the year correctly (Dec 25 + 14 = Jan 8)", () => {
    const from = new Date("2026-12-25T09:00:00.000Z");
    const due = computeDueAt(from, 14);
    expect(due.toISOString().slice(0, 10)).toBe("2027-01-08");
  });

  it("computeDueAt(now, DEFAULT_LOAN_DAYS) equals computeDueAt(now) (default-days lock)", () => {
    const a = computeDueAt(NOW, DEFAULT_LOAN_DAYS);
    const b = computeDueAt(NOW);
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe("deriveLoanStatus", () => {
  it("is overdue one millisecond past due", () => {
    const now = new Date("2026-06-23T09:00:00.000Z");
    const loan = { dueAt: new Date(now.getTime() - 1), returnedAt: null };
    expect(deriveLoanStatus(loan, now)).toBe("overdue");
  });
});

describe("libraryEndOfDay", () => {
  it("anchors 23:59:59 UTC+8 — equals 15:59:59 UTC", () => {
    expect(libraryEndOfDay("2026-06-30").toISOString()).toBe(
      "2026-06-30T15:59:59.000Z",
    );
  });
});
