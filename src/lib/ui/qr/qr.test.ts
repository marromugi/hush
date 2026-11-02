import { expect, test } from "vitest";

import { qrModules, readQr } from "./qr";

/** Draws modules as an RGBA image, `scale` pixels per module. */
function draw(modules: boolean[][], scale: number) {
  const width = modules.length * scale;
  const data = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const shade = modules[Math.floor(y / scale)][Math.floor(x / scale)] ? 0 : 255;
      data.set([shade, shade, shade, 255], (y * width + x) * 4);
    }
  }
  return { data, width, height: width };
}

test("a code drawn from the modules reads back as the same text", () => {
  const text = "H1-7Q2MD-X4KZ9-B3NFT-W8RCV-H6JP0A";
  expect(readQr(draw(qrModules(text), 6))).toBe(text);
});

test("an image without a code reads as nothing", () => {
  expect(readQr(draw([[false]], 60))).toBeNull();
});
