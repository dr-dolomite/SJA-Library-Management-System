import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-lg bg-primary font-mono text-base font-semibold text-primary-foreground"
          >
            SJ
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-foreground">St. Joseph&apos;s Academy</p>
            <p className="text-xs text-muted-foreground">Library Management System</p>
          </div>
        </div>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
          The library&apos;s system of record.
        </h1>
        <p className="mt-4 max-w-prose text-base text-muted-foreground text-pretty">
          Catalog, circulation, and venue reservations for library staff. The interface
          is being built slice by slice — this page confirms the brand foundation is live.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg">Sign in to continue</Button>
          <Button size="lg" variant="outline">
            View documentation
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gold px-2.5 py-1 text-xs font-medium text-gold-foreground">
            Foundation
          </span>
        </div>

        <div className="mt-10 flex items-center gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>Sample copy token</span>
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-secondary-foreground">
            cpy_8f3a2b7c
          </code>
        </div>
      </div>
    </main>
  );
}
