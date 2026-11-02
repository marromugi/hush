/** The longest side, in pixels, a saved picture keeps. */
const MAX_SIDE = 2000;

/** JPEG, since WebKit's canvas cannot encode WebP. */
const JPEG_QUALITY = 0.85;

export type Size = { width: number; height: number };

/** `size` scaled down so its longer side is at most `max`. Never enlarges. */
export function fitWithin(size: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/**
 * `picture` as a JPEG whose longer side is at most 2000px. Transparent parts
 * turn white. Rejects when the browser cannot read `picture` as an image.
 */
export async function shrinkImage(picture: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(picture);
  const { width, height } = fitWithin(bitmap, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d canvas");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const jpeg = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
  if (!jpeg) throw new Error("canvas gave no JPEG");
  return new Uint8Array(await jpeg.arrayBuffer());
}
