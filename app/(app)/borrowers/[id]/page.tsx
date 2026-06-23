import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, Phone } from "lucide-react";

import { getBorrowerLoans } from "@/lib/data/loans";
import { deriveLoanStatus } from "@/lib/loan-status";
import { LoanStatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Borrower · SJA-LMS",
};

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

export default async function BorrowerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const borrower = await getBorrowerLoans(id);
  if (!borrower) notFound();

  const now = new Date();
  const active = borrower.loans.filter((l) => l.returnedAt === null);
  const past = borrower.loans.filter((l) => l.returnedAt !== null);

  return (
    <>
      <div className="space-y-3">
        <Link
          href="/borrowers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ChevronLeft className="size-4" />
          Borrowers
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {borrower.fullName}
              </h1>
              {borrower.status !== "active" ? (
                <span className="text-sm text-muted-foreground">(inactive)</span>
              ) : null}
            </div>
            <p className="font-mono text-xs text-muted-foreground">{borrower.cardQr}</p>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {borrower.email ? (
              <a
                href={`mailto:${borrower.email}`}
                className="flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline"
              >
                <Mail aria-hidden className="size-3.5" />
                {borrower.email}
              </a>
            ) : null}
            {borrower.phone ? (
              <span className="flex items-center gap-2">
                <Phone aria-hidden className="size-3.5" />
                {borrower.phone}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <LoanSection
        title="Currently out"
        emptyLabel="No copies currently out."
        loans={active}
        now={now}
        showReturned={false}
      />
      <LoanSection
        title="History"
        emptyLabel="No past loans yet."
        loans={past}
        now={now}
        showReturned
      />
    </>
  );
}

function LoanSection({
  title,
  emptyLabel,
  loans,
  now,
  showReturned,
}: {
  title: string;
  emptyLabel: string;
  loans: {
    id: string;
    borrowedAt: Date;
    dueAt: Date;
    returnedAt: Date | null;
    copy: { copyQr: string; book: { title: string } };
  }[];
  now: Date;
  showReturned: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {loans.length > 0 ? (
          <span className="text-sm text-muted-foreground">{loans.length}</span>
        ) : null}
      </div>

      {loans.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Copy QR</TableHead>
                <TableHead>Borrowed</TableHead>
                <TableHead>{showReturned ? "Returned" : "Due"}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.copy.book.title}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {loan.copy.copyQr}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dateLabel(loan.borrowedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {showReturned && loan.returnedAt
                      ? dateLabel(loan.returnedAt)
                      : dateLabel(loan.dueAt)}
                  </TableCell>
                  <TableCell>
                    <LoanStatusBadge status={deriveLoanStatus(loan, now)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
