import { expect, test } from "vitest";

import { fitWithin, preparePicture, savedFormat } from "./preparePicture";

test("a picture larger than the limit shrinks to it on its longer side, keeping its shape", () => {
  expect(fitWithin({ width: 4032, height: 3024 }, 2000)).toEqual({ width: 2000, height: 1500 });
  expect(fitWithin({ width: 1170, height: 2532 }, 2000)).toEqual({ width: 924, height: 2000 });
});

test("a picture within the limit keeps its size", () => {
  expect(fitWithin({ width: 800, height: 600 }, 2000)).toEqual({ width: 800, height: 600 });
});

test("a GIF stays as it is, a PNG stays PNG, and anything else becomes JPEG", () => {
  expect(savedFormat("image/gif")).toBe("asIs");
  expect(savedFormat("image/png")).toBe("image/png");
  expect(savedFormat("image/jpeg")).toBe("image/jpeg");
  expect(savedFormat("image/heic")).toBe("image/jpeg");
  expect(savedFormat("image/webp")).toBe("image/jpeg");
});

test("a GIF is saved byte for byte", async () => {
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3]);
  const saved = await preparePicture(new Blob([gif], { type: "image/gif" }));
  expect([...saved]).toEqual([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3]);
});
