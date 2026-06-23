"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookDown,
  BookUp,
  CalendarDays,
  ChevronDown,
  Loader2,
  ScanLine,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyStatusBadge, LoanStatusBadge } from "@/components/status-badge";
import { computeDueAt, DEFAULT_LOAN_DAYS, deriveLoanStatus } from "@/lib/loan-status";
import { cn } from "@/lib/utils";
import { checkout, resolveBorrower, resolveCopy, returnCopy } from "./actions";
import type { BorrowerResolution, CopyResolution } from "@/lib/data/loans";

// yyyy-mm-dd in LOCAL time — the wire format the checkout action expects, kept
// free of the UTC shift toISOString() introduces near midnight.
function toDateInputValue(d: Date): string {
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

// Parse a yyyy-mm-dd string back to a local-midnight Date (so the calendar
// highlights the intended day, never the UTC-shifted neighbour).
function fromDateInputValue(v: string): Date {
  return new Date(`${v}T00:00:00`);
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

// Common loan periods for one-tap due dates — 2 weeks is the system default.
const DUE_PRESETS: { label: string; days: number }[] = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: DEFAULT_LOAN_DAYS },
  { label: "1 month", days: 30 },
];

export function CirculationDesk() {
  return (
    <Tabs defaultValue="checkout" className="gap-4">
      <TabsList className="h-9 w-full max-w-sm">
        <TabsTrigger value="checkout" className="gap-1.5">
          <BookUp className="size-4" />
          Check out
        </TabsTrigger>
        <TabsTrigger value="return" className="gap-1.5">
          <BookDown className="size-4" />
          Return
        </TabsTrigger>
      </TabsList>

      <TabsContent value="checkout">
        <CheckoutPanel />
      </TabsContent>
      <TabsContent value="return">
        <ReturnPanel />
      </TabsContent>
    </Tabs>
  );
}

// ─── Check out ────────────────────────────────────────────────────────────────

function CheckoutPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [copyQr, setCopyQr] = useState("");
  const [copy, setCopy] = useState<CopyResolution | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [cardQr, setCardQr] = useState("");
  const [borrower, setBorrower] = useState<BorrowerResolution | null>(null);
  const [borrowerError, setBorrowerError] = useState<string | null>(null);

  const [dueDate, setDueDate] = useState(() => toDateInputValue(computeDueAt(new Date())));

  const cardRef = useRef<HTMLInputElement>(null);
  const copyRef = useRef<HTMLInputElement>(null);

  const copyReady = copy?.status === "available";
  const canCheckout = copyReady && borrower?.status === "active";

  function lookupCopy() {
    if (!copyQr.trim()) return;
    startTransition(async () => {
      const res = await resolveCopy(copyQr);
      if (res.ok) {
        setCopy(res.copy);
        setCopyError(null);
        if (res.copy.status === "available") cardRef.current?.focus();
      } else {
        setCopy(null);
        setCopyError(res.error);
      }
    });
  }

  function lookupBorrower() {
    if (!cardQr.trim()) return;
    startTransition(async () => {
      const res = await resolveBorrower(cardQr);
      if (res.ok) {
        setBorrower(res.borrower);
        setBorrowerError(null);
      } else {
        setBorrower(null);
        setBorrowerError(res.error);
      }
    });
  }

  function reset() {
    setCopyQr("");
    setCopy(null);
    setCopyError(null);
    setCardQr("");
    setBorrower(null);
    setBorrowerError(null);
    setDueDate(toDateInputValue(computeDueAt(new Date())));
    copyRef.current?.focus();
  }

  function confirm() {
    startTransition(async () => {
      const res = await checkout({ copyQr, cardQr, dueDate });
      if (res.ok) {
        toast.success(`Checked out “${res.copyTitle}”`, {
          description: `To ${res.borrowerName} · due ${dateLabel(new Date(`${dueDate}T23:59:59`))}`,
        });
        reset();
        router.refresh();
      } else {
        toast.error(res.error);
        copyRef.current?.focus();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="grid gap-px overflow-hidden rounded-lg bg-border md:grid-cols-2">
        {/* Step 1 — the copy */}
        <Field className="bg-card">
          <ScanField
            ref={copyRef}
            id="checkout-copy"
            label="Copy"
            placeholder="Scan or type a copy QR"
            value={copyQr}
            onChange={(v) => { setCopyQr(v); setCopy(null); setCopyError(null); }}
            onSubmit={lookupCopy}
            disabled={pending}
            error={copyError}
          />
          {copy ? <CopyPanel copy={copy} /> : null}
        </Field>

        {/* Step 2 — the borrower */}
        <Field className="bg-card">
          <ScanField
            ref={cardRef}
            id="checkout-card"
            label="Borrower card"
            placeholder="Scan the borrower card"
            value={cardQr}
            onChange={(v) => { setCardQr(v); setBorrower(null); setBorrowerError(null); }}
            onSubmit={lookupBorrower}
            disabled={pending}
            error={borrowerError}
          />
          {borrower ? <BorrowerPanel borrower={borrower} /> : null}
        </Field>
      </div>

      {/* Step 3 — terms + confirm */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due-date">Due date</Label>
          <DueDatePicker value={dueDate} onChange={setDueDate} disabled={pending} />
        </div>
        <Button onClick={confirm} disabled={!canCheckout || pending} className="min-w-36">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <BookUp className="size-4" />
          )}
          Check out
        </Button>
      </div>
    </div>
  );
}

// ─── Return ───────────────────────────────────────────────────────────────────

function ReturnPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copyQr, setCopyQr] = useState("");
  const [copy, setCopy] = useState<CopyResolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copyRef = useRef<HTMLInputElement>(null);

  const onLoan = copy?.openLoan ?? null;

  function lookup() {
    if (!copyQr.trim()) return;
    startTransition(async () => {
      const res = await resolveCopy(copyQr);
      if (res.ok) {
        setCopy(res.copy);
        setError(res.copy.openLoan ? null : "This copy isn’t checked out.");
      } else {
        setCopy(null);
        setError(res.error);
      }
    });
  }

  function confirm() {
    startTransition(async () => {
      const res = await returnCopy(copyQr);
      if (res.ok) {
        toast.success(`Returned “${res.copyTitle}”`, {
          description: `From ${res.borrowerName}`,
        });
        setCopyQr("");
        setCopy(null);
        setError(null);
        copyRef.current?.focus();
        router.refresh();
      } else {
        toast.error(res.error);
        copyRef.current?.focus();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Field className="bg-card">
        <ScanField
          ref={copyRef}
          id="return-copy"
          label="Copy"
          placeholder="Scan the copy being returned"
          value={copyQr}
          onChange={(v) => { setCopyQr(v); setCopy(null); setError(null); }}
          onSubmit={lookup}
          disabled={pending}
          error={error}
        />
        {copy ? <CopyPanel copy={copy} /> : null}
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          {onLoan
            ? `On loan to ${onLoan.borrowerName}, due ${dateLabel(onLoan.dueAt)}.`
            : "Scan a checked-out copy to take it back."}
        </p>
        <Button onClick={confirm} disabled={!onLoan || pending} className="min-w-36">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <BookDown className="size-4" />
          )}
          Return copy
        </Button>
      </div>
    </div>
  );
}

// ─── Shared building blocks ───────────────────────────────────────────────────

function DueDatePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromDateInputValue(value) : undefined;
  const today = startOfToday();
  const daysOut = selected
    ? Math.round((selected.getTime() - today.getTime()) / 86_400_000)
    : null;

  function commit(next: Date) {
    onChange(toDateInputValue(next));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="due-date"
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-48 justify-between font-normal"
        >
          <span className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
            {selected ? dateLabel(selected) : "Pick a date"}
          </span>
          <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? today}
          disabled={{ before: today }}
          autoFocus
          className="p-3 [--cell-size:--spacing(9)]"
          onSelect={(d) => d && commit(d)}
        />
        <div className="space-y-2 border-t border-border p-3">
          <p className="text-xs text-muted-foreground">
            {daysOut === null
              ? "No due date set"
              : daysOut <= 0
                ? "Due today"
                : `Due in ${daysOut} ${daysOut === 1 ? "day" : "days"}`}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {DUE_PRESETS.map((p) => (
              <Button
                key={p.days}
                type="button"
                variant={daysOut === p.days ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => commit(computeDueAt(new Date(), p.days))}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-4 p-4", className)}>{children}</div>;
}

function ScanField({
  ref,
  id,
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  disabled,
  error,
}: {
  ref: React.RefObject<HTMLInputElement | null>;
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  error: string | null;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={ref}
            id={id}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            className="pl-9 font-mono"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
        >
          Look up
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-destructive">
          <TriangleAlert aria-hidden className="size-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CopyPanel({ copy }: { copy: CopyResolution }) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{copy.title}</p>
          {copy.author ? (
            <p className="truncate text-sm text-muted-foreground">{copy.author}</p>
          ) : null}
          <p className="mt-1 font-mono text-xs text-muted-foreground">{copy.copyQr}</p>
        </div>
        <CopyStatusBadge status={copy.status} />
      </div>

      {copy.openLoan ? (
        <p className="text-sm text-muted-foreground">
          On loan to{" "}
          <span className="font-medium text-foreground">{copy.openLoan.borrowerName}</span>,
          due {dateLabel(copy.openLoan.dueAt)}.
        </p>
      ) : null}

      {copy.history.length > 0 ? (
        <div className="space-y-1.5 border-t border-border pt-2.5">
          <p className="text-xs font-medium text-muted-foreground">Recent history</p>
          <ul className="space-y-1">
            {copy.history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span className="truncate">{h.borrowerName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono">{dateLabel(h.borrowedAt)}</span>
                  <LoanStatusBadge status={deriveLoanStatus(h)} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BorrowerPanel({ borrower }: { borrower: BorrowerResolution }) {
  const inactive = borrower.status !== "active";
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{borrower.fullName}</p>
            <p className="font-mono text-xs text-muted-foreground">{borrower.cardQr}</p>
          </div>
        </div>
        {inactive ? (
          <span role="status" className="flex items-center gap-1 text-sm text-destructive">
            <TriangleAlert aria-hidden className="size-3.5" />
            Inactive
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        {borrower.activeLoanCount === 0
          ? "No copies currently out."
          : `${borrower.activeLoanCount} ${
              borrower.activeLoanCount === 1 ? "copy" : "copies"
            } currently out.`}
      </p>
    </div>
  );
}
