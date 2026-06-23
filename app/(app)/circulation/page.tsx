import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import { listOpenLoans } from "@/lib/data/loans";
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
import { CirculationDesk } from "./circulation-desk";

export const metadata: Metadata = {
  title: "Circulation · SJA-LMS",
};

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

export default async function CirculationPage() {
  const openLoans = await listOpenLoans();
  const now = new Date();

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Circulation
        </h1>
        <p className="text-sm text-muted-foreground">
          Check copies out to borrowers and take them back. Scan a copy QR to begin.
        </p>
      </div>

      <CirculationDesk />

      {/* Currently out — soonest due first, overdue surfaced by the gilt badge */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-medium text-foreground">Currently out</h2>
          {openLoans.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              {openLoans.length} {openLoans.length === 1 ? "loan" : "loans"}
            </span>
          ) : null}
        </div>

        {openLoans.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 p-8">
            <div className="flex max-w-sm flex-col items-center text-center">
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
              >
                <ArrowLeftRight className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-medium text-foreground">
                Nothing is checked out
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                Every copy is on the shelf. Check one out above and it will appear here
                until it&apos;s returned.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Copy QR</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Borrowed</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openLoans.map((loan) => {
                  const status = deriveLoanStatus(
                    { dueAt: loan.dueAt, returnedAt: null },
                    now,
                  );
                  return (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.copyTitle}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {loan.copyQr}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/borrowers/${loan.borrowerId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {loan.borrowerName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dateLabel(loan.borrowedAt)}
                      </TableCell>
                      <TableCell
                        className={
                          status === "overdue"
                            ? "text-sm font-medium text-foreground"
                            : "text-sm text-muted-foreground"
                        }
                      >
                        {dateLabel(loan.dueAt)}
                      </TableCell>
                      <TableCell>
                        <LoanStatusBadge status={status} />
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
