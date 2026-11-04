import { expect, test } from "vitest";

import { keyboardBands } from "./keyboardBands";

test("leaves the bands at the window's edges while the whole window shows", () => {
  expect(keyboardBands(0, 0, 62, 34)).toEqual({
    headerTop: 0,
    footerBottom: 0,
    keepClear: { top: 146, bottom: 138 },
  });
});

test("puts the footer on the keyboard, with the home indicator room behind it", () => {
  expect(keyboardBands(0, 336, 62, 34)).toEqual({
    headerTop: 0,
    footerBottom: 302,
    keepClear: { top: 146, bottom: 104 },
  });
});

test("moves the header down with the part in view, leaving the cursor's room as it is", () => {
  expect(keyboardBands(238, 142, 62, 34)).toEqual({
    headerTop: 238,
    footerBottom: 108,
    keepClear: { top: 146, bottom: 104 },
  });
});

test("does not lift the footer while the keyboard covers less than the home indicator", () => {
  expect(keyboardBands(0, 20, 62, 34)).toEqual({
    headerTop: 0,
    footerBottom: 0,
    keepClear: { top: 146, bottom: 138 },
  });
});
