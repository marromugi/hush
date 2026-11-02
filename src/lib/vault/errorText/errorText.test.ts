import { expect, test } from "vitest";

import { HUSH_ERROR_KINDS, HushError } from "@/lib/vault/hushError";

import { errorText, failureText } from "./errorText";

test("every kind has its own sentence", () => {
  const texts = HUSH_ERROR_KINDS.map((kind) => errorText(kind));
  expect(texts.every((text) => text.length > 0)).toBe(true);
  expect(new Set(texts).size).toBe(texts.length);
});

test("a failure of any shape reads as the sentence for its kind", () => {
  expect(failureText(new HushError("locked", "vault is locked"))).toBe(errorText("locked"));
  expect(failureText({ kind: "io", message: "file access failed" })).toBe(errorText("io"));
  expect(failureText(new Error("something else"))).toBe(errorText("unknown"));
});
