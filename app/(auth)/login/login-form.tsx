"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// ── Error message mapping ────────────────────────────────────────────────────
// Verified against:
//   node_modules/better-auth/dist/plugins/admin/error-codes.d.mts  → BANNED_USER code
//   node_modules/better-auth/dist/api/routes/sign-in.d.mts          → endpoint shape
//   node_modules/better-auth/dist/client/vanilla.d.mts              → { data, error } return
// The admin plugin returns code "BANNED_USER" and status 403 for disabled accounts.
// Invalid credentials come back as status 401. Network/unexpected errors are caught
// by the surrounding try/catch and fall through to the generic message.

function mapAuthError(error: {
  message?: string;
  code?: string;
  status?: number;
}): string {
  const status = error.status;
  const code = (error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toLowerCase();

  // Disabled/banned account — admin plugin: code BANNED_USER, status 403,
  // or any hint of "ban" in the code/message (defensive fallback).
  if (
    status === 403 ||
    code === "BANNED_USER" ||
    code.includes("BAN") ||
    message.includes("ban") ||
    message.includes("disabled")
  ) {
    return "This account has been disabled. Contact an administrator.";
  }

  // Invalid credentials — status 401, or credential-related codes.
  if (
    status === 401 ||
    code === "INVALID_EMAIL_OR_PASSWORD" ||
    code === "INVALID_PASSWORD" ||
    code === "USER_NOT_FOUND" ||
    message.includes("invalid") ||
    message.includes("incorrect") ||
    message.includes("not found")
  ) {
    return "Email or password is incorrect.";
  }

  // Generic fallback for anything else (rate limits, 5xx, unknown codes).
  return "Something went wrong. Please try again.";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LoginForm({
  redirectTo = "/dashboard",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear the error banner as soon as the user edits any field.
  function clearError() {
    if (errorMessage !== null) setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isSubmitting) return;

    // Light client-side validation before hitting the network.
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Email or password is incorrect.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMessage(mapAuthError(error));
        return;
      }

      // Success — refresh the RSC tree so the server session is picked up,
      // then navigate to the post-login destination.
      router.refresh();
      router.push(redirectTo);
    } catch {
      // Network failures, unexpected throws from better-fetch, etc.
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full animate-in fade-in duration-300",
        // Respect reduced-motion: tw-animate-css honours @media (prefers-reduced-motion)
        // by making animate-in a no-op, so content is never gated on JS/animation.
      )}
    >
      {/* ── Heading ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Library staff access.
        </p>
      </div>

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="staff@sja.edu.ph"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError();
            }}
            disabled={isSubmitting}
            required
            aria-required="true"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              disabled={isSubmitting}
              required
              aria-required="true"
              // Make room for the toggle button.
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={cn(
                "absolute inset-y-0 right-0 flex items-center px-2.5",
                "text-muted-foreground hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-r-lg",
                "disabled:pointer-events-none",
              )}
              disabled={isSubmitting}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Error alert — rendered only when there is an error */}
        {errorMessage !== null && (
          <Alert
            variant="destructive"
            role="alert"
            aria-live="polite"
            className="border-destructive/40"
          >
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Signing in&hellip;
            </>
          ) : (
            "Sign in"
          )}
        </Button>

      </form>

      {/* ── Recovery note ──────────────────────────────────────────────── */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Forgot your password?{" "}
        <span className="font-medium">Contact an administrator.</span>
      </p>
    </div>
  );
}
