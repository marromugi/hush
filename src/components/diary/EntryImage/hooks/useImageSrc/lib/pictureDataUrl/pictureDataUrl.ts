/** Bytes turned into text per step; `String.fromCharCode` takes them as arguments, which are limited. */
const CHUNK = 0x8000;

/** Each format an image file holds, by the bytes it starts with. */
const FORMATS: Array<[start: number[], mediaType: string]> = [
  [[0xff, 0xd8, 0xff], "image/jpeg"],
  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
  [[0x47, 0x49, 0x46, 0x38], "image/gif"],
];

/** A `data:` URL that shows `picture`, a JPEG, PNG, or GIF. Throws for any other bytes. */
export function pictureDataUrl(picture: ArrayBuffer): string {
  const bytes = new Uint8Array(picture);
  const mediaType = FORMATS.find(([start]) => start.every((byte, i) => bytes[i] === byte))?.[1];
  if (!mediaType) throw new Error("not a JPEG, PNG, or GIF");
  let binary = "";
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return `data:${mediaType};base64,${btoa(binary)}`;
}
