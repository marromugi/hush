import { expect, test } from "vitest";

import { pictureType } from "./pictureType";

test("a PNG and a GIF are told apart from other pictures", () => {
  expect(
    pictureType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]).buffer),
  ).toBe("image/png");
  expect(pictureType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).buffer)).toBe(
    "image/gif",
  );
  expect(pictureType(new Uint8Array([0xff, 0xd8, 0xff]).buffer)).toBe("");
  expect(pictureType(new TextEncoder().encode("RIFF....WEBP").buffer)).toBe("");
});
