import { expect, test } from "vitest";

import { imageFiles } from "./imageFiles";

function pasted(files: File[], text?: string): DataTransfer {
  const data = new DataTransfer();
  for (const file of files) data.items.add(file);
  if (text !== undefined) data.setData("text/plain", text);
  return data;
}

const shot = new File([], "shot.png", { type: "image/png" });
const photo = new File([], "photo.heic", { type: "image/heic" });
const note = new File([], "note.pdf", { type: "application/pdf" });

test("keeps only the pictures, in order", () => {
  const names = imageFiles(pasted([shot, note, photo])).map((file) => file.name);
  expect(names).toEqual(["shot.png", "photo.heic"]);
});

test("a picture that comes with text is left for the text to be pasted", () => {
  expect(imageFiles(pasted([shot], "A1\tB1"))).toEqual([]);
});

test("nothing pasted has no pictures", () => {
  expect(imageFiles(pasted([]))).toEqual([]);
  expect(imageFiles(null)).toEqual([]);
});
