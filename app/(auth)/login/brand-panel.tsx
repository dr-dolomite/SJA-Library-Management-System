import Image from "next/image";

/**
 * BrandPanel — the desktop-right green photo panel.
 *
 * `school-front.png` is used purely as texture beneath a deep pine-green
 * scrim.  Two scrim layers stack on top of the image:
 *   1. A solid `bg-primary` overlay at 60 % opacity with `mix-blend-multiply`
 *      (darkens the photo tones into the brand green).
 *   2. A gradient `from-primary/95 via-primary/70 to-primary/40` (bottom →
 *      top) so the bottom lockup always has near-opaque backing and the upper
 *      portion lets a ghost of the building texture show through.
 * Together they keep the building barely perceptible while guaranteeing that
 * white text at any point in the panel clears WCAG AA (4.5 : 1).
 *
 * This is a Server Component — no client interactivity.
 */
export default function BrandPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-primary">
      {/* ── Background photo (texture layer) ──────────────────────────── */}
      <Image
        src="/school-front.png"
        alt=""
        aria-hidden
        fill
        priority
        sizes="55vw"
        className="object-cover object-center"
      />

      {/* ── Scrim layer 1: multiply blend darkens photo into brand green ─ */}
      <div
        aria-hidden
        className="absolute inset-0 bg-primary/60 mix-blend-multiply"
      />

      {/* ── Scrim layer 2: vertical gradient, heaviest at bottom ────────── */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/70 to-primary/40"
      />

      {/* ── Foreground content (above scrims) ───────────────────────────── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-10 py-12 text-primary-foreground">

        {/* Top: school seal */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/sja-logo.png"
            alt="St. Joseph's Academy seal"
            width={72}
            height={72}
            priority
            className="rounded-full drop-shadow-lg"
          />
        </div>

        {/* Bottom: institutional lockup */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Thin gold rule — ceremonial accent only */}
          <div className="h-px w-16 bg-gold opacity-70" aria-hidden />

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/60">
              Est. <span className="text-gold/80">1947</span>
            </span>

            <p className="text-balance text-2xl font-semibold leading-tight tracking-tight">
              St. Joseph&rsquo;s Academy
            </p>

            <p className="text-sm font-normal text-primary-foreground/70">
              Library Management System
            </p>
          </div>

          {/* Thin gold rule — bottom mirror */}
          <div className="h-px w-16 bg-gold opacity-70" aria-hidden />
        </div>
      </div>
    </div>
  );
}
