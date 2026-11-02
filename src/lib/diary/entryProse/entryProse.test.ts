import { expect, test } from "vitest";

import { fontLoadingStyle } from "./entryProse";

test("text is blurred and faded out while its font loads, and shown once loaded", () => {
  expect(fontLoadingStyle(true).split(" ")).toEqual(
    expect.arrayContaining(["blur-sm", "opacity-0"]),
  );
  expect(fontLoadingStyle(false).split(" ")).not.toContain("blur-sm");
  expect(fontLoadingStyle(false).split(" ")).not.toContain("opacity-0");
});
