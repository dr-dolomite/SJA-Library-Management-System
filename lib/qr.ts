import { customAlphabet } from "nanoid";

// No look-alikes (0/O, 1/I/l) to keep printed/scanned codes unambiguous.
export const TOKEN_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

const nano = customAlphabet(TOKEN_ALPHABET, 12);

export function newCopyToken(): string {
  return `cpy_${nano()}`;
}

export function newCardToken(): string {
  return `brw_${nano()}`;
}
