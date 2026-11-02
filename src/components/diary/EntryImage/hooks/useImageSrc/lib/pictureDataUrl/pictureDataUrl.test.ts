import { expect, test } from "vitest";

import { pictureDataUrl } from "./pictureDataUrl";

function buffer(...bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

test("gives each format as a Base64 data URL of its own type", () => {
  expect(pictureDataUrl(buffer(0xff, 0xd8, 0xff, 0xe0))).toBe("data:image/jpeg;base64,/9j/4A==");
  expect(pictureDataUrl(buffer(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
    "data:image/png;base64,iVBORw0KGgo=",
  );
  expect(pictureDataUrl(buffer(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe(
    "data:image/gif;base64,R0lGODlh",
  );
});

test("refuses bytes in no known format", () => {
  expect(() => pictureDataUrl(buffer(0x52, 0x49, 0x46, 0x46))).toThrow("not a JPEG, PNG, or GIF");
});

test("keeps every byte of a picture larger than one step", () => {
  const bytes = new Uint8Array(0x8000 * 2 + 3).map((_, i) => i % 256);
  bytes.set([0xff, 0xd8, 0xff]);
  const url = pictureDataUrl(bytes.buffer);
  const decoded = Uint8Array.from(atob(url.split(",")[1]), (c) => c.charCodeAt(0));
  expect(decoded).toEqual(bytes);
});
