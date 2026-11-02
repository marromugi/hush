import { expect, test } from "vitest";

import { entryTextStyle } from "./entryTextStyle";

test("gives the size in px, the line height as a multiple, and the letter spacing in em", () => {
  expect(entryTextStyle({ size: 20, lineHeight: 1.8, letterSpacing: 0.05 })).toEqual({
    "--entry-size": "20px",
    "--entry-line": "1.8",
    "--entry-tracking": "0.05em",
  });
});
