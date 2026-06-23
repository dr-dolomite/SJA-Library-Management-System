// Stub for `server-only` in the Vitest environment.
// The real package throws at import time when not in a React Server Component
// context. Tests run in Node, not RSC, so we replace it with a no-op.
export {};
