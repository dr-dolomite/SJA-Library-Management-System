/**
 * First-admin seed.
 *
 * Creates the initial Admin staff account. Public signup is disabled
 * (`disableSignUp: true`), so this is the only way the first account can exist;
 * every subsequent staff member is created by an admin from the app.
 *
 * Run with:  pnpm db:seed
 * Reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME from .env.local.
 * Idempotent — re-running when the admin already exists is a no-op.
 */
import { config } from "dotenv";

// Load env BEFORE importing the auth/prisma chain: lib/prisma builds the pg
// driver adapter from DATABASE_URL at module-eval time, so it must be set first.
config({ path: ".env.local" });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    console.error(
      "✗ Missing SEED_ADMIN_EMAIL and/or SEED_ADMIN_PASSWORD.\n" +
        "  Add them to .env.local, then re-run `pnpm db:seed`.",
    );
    process.exit(1);
  }

  // Dynamic import so the env above is in place before this chain evaluates.
  const { auth } = await import("@/lib/auth");

  try {
    const { user } = await auth.api.createUser({
      body: { email, password, name, role: "admin" },
    });
    console.log(`✓ Created admin account: ${user.email} (role: admin)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(message)) {
      console.log(`• Admin ${email} already exists — nothing to do.`);
    } else {
      console.error("✗ Seed failed:", err);
      process.exit(1);
    }
  }
}

main();
