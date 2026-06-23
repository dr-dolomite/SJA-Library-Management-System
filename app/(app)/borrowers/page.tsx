import type { Metadata } from "next";
import { Users } from "lucide-react";
import { listBorrowers } from "@/lib/data/borrowers";
import { createBorrower } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Borrowers · SJA-LMS",
};

export default async function BorrowersPage() {
  const borrowers = await listBorrowers();

  return (
    <>
      {/* Page header — matches the dashboard idiom */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Borrowers
        </h1>
        <p className="text-sm text-muted-foreground">
          Register patron borrower cards and look up borrowing records.
        </p>
      </div>

      {/* Add borrower form */}
      <Card className="shadow-none border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Add borrower</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBorrower} className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">
                Full name <span aria-hidden className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="e.g. Maria Santos"
                required
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="patron@example.com"
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+63 912 345 6789"
                className="w-44"
              />
            </div>
            <Button type="submit">Register</Button>
          </form>
        </CardContent>
      </Card>

      {/* Borrower list or empty state */}
      {borrowers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 p-8">
          <div className="flex max-w-sm flex-col items-center text-center">
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
            >
              <Users className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-medium text-foreground">
              No borrowers yet
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Register the first patron using the form above. Each registration
              generates a unique QR card token for circulation.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Card QR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrowers.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.fullName}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {b.cardQr}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        b.status === "active"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {b.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {b.createdAt.toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
