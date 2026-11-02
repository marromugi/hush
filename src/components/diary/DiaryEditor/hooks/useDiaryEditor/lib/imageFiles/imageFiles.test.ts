import { expect, test } from "vitest";

import { imageFiles } from "./imageFiles";

function pasted(...files: File[]): DataTransfer {
  const data = new DataTransfer();
  for (const file of files) data.items.add(file);
  return data;
}

test("keeps only the pictures, in order", () => {
  const shot = new File([], "shot.png", { type: "image/png" });
  const photo = new File([], "photo.heic", { type: "image/heic" });
  const note = new File([], "note.txt", { type: "text/plain" });
  expect(imageFiles(pasted(shot, note, photo))).toEqual([shot, photo]);
});

test("text alone has no pictures", () => {
  expect(imageFiles(pasted())).toEqual([]);
  expect(imageFiles(null)).toEqual([]);
});
