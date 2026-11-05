/** Each format whose media type changes how a picture is saved, by the bytes it starts with. */
const FORMATS: Array<[start: number[], mediaType: string]> = [
  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
  [[0x47, 0x49, 0x46, 0x38], "image/gif"],
];

/**
 * The media type of `picture` when it is a PNG or GIF, which are saved
 * differently from other pictures; an empty string for anything else.
 */
export function pictureType(picture: ArrayBuffer): string {
  const bytes = new Uint8Array(picture);
  return FORMATS.find(([start]) => start.every((byte, i) => bytes[i] === byte))?.[1] ?? "";
}
