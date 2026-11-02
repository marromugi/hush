import { expect, test } from "vitest";

import { jpegDataUrl } from "./jpegDataUrl";

test("gives the bytes as a Base64 JPEG data URL", () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  expect(jpegDataUrl(bytes.buffer)).toBe("data:image/jpeg;base64,/9j/4A==");
});

test("keeps every byte of a picture larger than one step", () => {
  const bytes = new Uint8Array(0x8000 * 2 + 3).map((_, i) => i % 256);
  const url = jpegDataUrl(bytes.buffer);
  const decoded = Uint8Array.from(atob(url.split(",")[1]), (c) => c.charCodeAt(0));
  expect(decoded).toEqual(bytes);
});
