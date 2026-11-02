import jsQR from "jsqr";
import { encode } from "uqr";

/** Modules around the code that readers need to find it, per the QR standard. */
const QUIET_ZONE = 4;

/** `text` as a QR code: rows of modules, `true` for dark, quiet zone included. */
export function qrModules(text: string): boolean[][] {
  return encode(text, { ecc: "M", border: QUIET_ZONE }).data;
}

/** The text of the first QR code found in an RGBA image, or `null`. */
export function readQr(image: Pick<ImageData, "data" | "width" | "height">): string | null {
  return jsQR(image.data, image.width, image.height)?.data ?? null;
}
