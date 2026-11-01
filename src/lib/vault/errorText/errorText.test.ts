import { expect, test } from "vitest";

import { HUSH_ERROR_KINDS } from "../hushError";
import { errorText } from "./errorText";

test("every kind has its own sentence", () => {
  const texts = HUSH_ERROR_KINDS.map((kind) => errorText(kind));
  expect(texts.every((text) => text.length > 0)).toBe(true);
  expect(new Set(texts).size).toBe(texts.length);
});
