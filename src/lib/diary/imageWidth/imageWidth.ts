/** The narrowest an image can be made, in percent of the entry's width. */
const MIN_WIDTH = 10;

/** The widest, in the same percent: the entry's full width. */
const MAX_WIDTH = 100;

/** `percent` as a whole number within what an image's width can be. */
function clampWidth(percent: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(percent)));
}

/**
 * The width written in an entry's HTML, in percent of the entry's width.
 * `null`, for an image shown at its own size (up to the entry's width), when
 * nothing is written or the text is not a whole number in range.
 */
export function parseWidth(text: string | null): number | null {
  if (text === null || !/^\d+$/.test(text)) return null;
  const percent = Number(text);
  return clampWidth(percent) === percent ? percent : null;
}

/**
 * The width, in percent of `columnWidth`, of an image that was `startWidth`
 * pixels wide and has grown by `growth` pixels (shrunk, when negative).
 */
export function grownWidth(startWidth: number, growth: number, columnWidth: number): number {
  return clampWidth(((startWidth + growth) / columnWidth) * 100);
}
