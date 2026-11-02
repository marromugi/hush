import { expect, test } from "vitest";

import { fontLoadingStyle } from "./entryProse";

const classes = (loading: boolean) => fontLoadingStyle(loading).split(" ");

test("text is blurred and faded while its font loads, and shown once loaded", () => {
  expect(classes(true)).toEqual(expect.arrayContaining(["blur-sm", "opacity-30"]));
  expect(classes(false)).not.toContain("blur-sm");
  expect(classes(false)).not.toContain("opacity-30");
});

test("the blur and the fade both animate, unless motion is reduced", () => {
  for (const loading of [true, false]) {
    expect(classes(loading)).toEqual(
      expect.arrayContaining(["transition-[filter,opacity]", "motion-reduce:transition-none"]),
    );
  }
});
