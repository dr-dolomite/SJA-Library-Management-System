import { describe, it, expect } from "vitest";
import { newCopyToken, newCardToken } from "./qr";

describe("qr tokens", () => {
  it("copy tokens are prefixed and 16 chars total", () => {
    const t = newCopyToken();
    expect(t).toMatch(/^cpy_[0-9A-HJ-NP-Za-km-z]{12}$/);
  });

  it("card tokens are prefixed and 16 chars total", () => {
    const t = newCardToken();
    expect(t).toMatch(/^brw_[0-9A-HJ-NP-Za-km-z]{12}$/);
  });

  it("tokens are unique across many draws", () => {
    const set = new Set(Array.from({ length: 1000 }, () => newCopyToken()));
    expect(set.size).toBe(1000);
  });
});
