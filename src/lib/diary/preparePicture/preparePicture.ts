/** The longest side, in pixels, a redrawn picture keeps. */
const MAX_SIDE = 2000;

/** For JPEG; PNG is lossless and takes no quality. */
const JPEG_QUALITY = 0.85;

export type Size = { width: number; height: number };

/**
 * How a pasted picture of `type` is saved: as it is, or redrawn smaller as
 * PNG or JPEG. A GIF stays as it is, since redrawing keeps only its first
 * frame. A PNG stays PNG, keeping transparency and sharp edges. Anything
 * else becomes JPEG, since WebKit's canvas cannot encode WebP.
 */
export function savedFormat(type: string): "asIs" | "image/png" | "image/jpeg" {
  if (type === "image/gif") return "asIs";
  if (type === "image/png") return "image/png";
  return "image/jpeg";
}

/** `size` scaled down so its longer side is at most `max`. Never enlarges. */
export function fitWithin(size: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/**
 * The bytes to save for a pasted `picture`, in the format `savedFormat`
 * picks. A redrawn picture's longer side is at most 2000px, and in a JPEG
 * transparent parts turn white. Redrawing also leaves out metadata such as
 * where a photo was taken. Rejects when the browser cannot read `picture`
 * as an image.
 */
export async function preparePicture(picture: Blob): Promise<Uint8Array> {
  const format = savedFormat(picture.type);
  if (format === "asIs") return new Uint8Array(await picture.arrayBuffer());

  const bitmap = await createImageBitmap(picture);
  const { width, height } = fitWithin(bitmap, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d canvas");
  if (format === "image/jpeg") {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const redrawn = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, format, JPEG_QUALITY);
  });
  if (!redrawn) throw new Error(`canvas gave no ${format}`);
  return new Uint8Array(await redrawn.arrayBuffer());
}
