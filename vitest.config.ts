import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Path aliases matching tsconfig so imports like @/lib/… resolve in tests.
      "@": path.resolve(__dirname, "."),
      // server-only throws outside a React Server Component context.
      // The test runner is plain Node, so stub it out with a no-op.
      "server-only": path.resolve(__dirname, "vitest-mocks/server-only.ts"),
    },
  },
});
