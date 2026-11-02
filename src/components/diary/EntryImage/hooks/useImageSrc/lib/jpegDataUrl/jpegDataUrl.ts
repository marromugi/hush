/** Bytes turned into text per step; `String.fromCharCode` takes them as arguments, which are limited. */
const CHUNK = 0x8000;

/** A `data:` URL that shows `jpeg`. */
export function jpegDataUrl(jpeg: ArrayBuffer): string {
  const bytes = new Uint8Array(jpeg);
  let binary = "";
  for (let start = 0; start < bytes.length; start += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}
