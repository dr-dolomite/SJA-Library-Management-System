import { Ban, CalendarCheck, Check, Clock, RotateCcw, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LoanStatus } from "@/lib/loan-status";
import type { ReservationStatus } from "@/lib/reservation-status";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservation-status";
import { cn } from "@/lib/utils";

/**
 * Status is NEVER conveyed by color alone (DESIGN.md / WCAG AA): every pill
 * pairs a hue with a word and an icon. Gold is the gilt "needs the eye" marker —
 * reserved here for Overdue and nothing else.
 */

type CopyStatus = "available" | "borrowed" | "lost";

const COPY: Record<
  CopyStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  available: {
    label: "Available",
    icon: Check,
    className: "bg-secondary text-secondary-foreground",
  },
  borrowed: {
    label: "On loan",
    icon: Clock,
    className: "bg-secondary text-secondary-foreground",
  },
  lost: {
    label: "Lost",
    icon: Ban,
    className: "bg-destructive/10 text-destructive",
  },
};

const LOAN: Record<
  LoanStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  on_loan: {
    label: "On loan",
    icon: Clock,
    className: "bg-secondary text-secondary-foreground",
  },
  // The one gilt status — the row that needs the librarian's eye.
  overdue: {
    label: "Overdue",
    icon: TriangleAlert,
    className: "bg-gold text-gold-foreground",
  },
  returned: {
    label: "Returned",
    icon: RotateCcw,
    className: "bg-muted text-muted-foreground",
  },
};

export function CopyStatusBadge({
  status,
  className,
}: {
  status: CopyStatus;
  className?: string;
}) {
  const s = COPY[status];
  const Icon = s.icon;
  return (
    <Badge className={cn("gap-1", s.className, className)}>
      <Icon aria-hidden className="size-3" />
      {s.label}
    </Badge>
  );
}

export function LoanStatusBadge({
  status,
  className,
}: {
  status: LoanStatus;
  className?: string;
}) {
  const s = LOAN[status];
  const Icon = s.icon;
  return (
    <Badge className={cn("gap-1", s.className, className)}>
      <Icon aria-hidden className="size-3" />
      {s.label}
    </Badge>
  );
}

const RESERVATION: Record<
  ReservationStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  booked: {
    label: RESERVATION_STATUS_LABEL.booked,
    icon: CalendarCheck,
    className: "bg-secondary text-secondary-foreground",
  },
  completed: {
    label: RESERVATION_STATUS_LABEL.completed,
    icon: RotateCcw,
    className: "bg-muted text-muted-foreground",
  },
  cancelled: {
    label: RESERVATION_STATUS_LABEL.cancelled,
    icon: X,
    className: "bg-destructive/10 text-destructive",
  },
};

export function ReservationStatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  const s = RESERVATION[status];
  const Icon = s.icon;
  return (
    <Badge className={cn("gap-1", s.className, className)}>
      <Icon aria-hidden className="size-3" />
      {s.label}
    </Badge>
  );
}
