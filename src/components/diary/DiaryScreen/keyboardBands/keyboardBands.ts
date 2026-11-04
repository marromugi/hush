import type { KeepClear } from "@/components/diary/DiaryEditor/type";

/** The sticky header (h-21) and footer (h-26), in pixels, before the safe-area insets. */
export const BANDS = { top: 84, bottom: 104 };

export type KeyboardBands = {
  /** How far the header moves down to stay at the top of what is in view. */
  headerTop: number;
  /** How far the footer moves up to sit on the keyboard. */
  footerBottom: number;
  /** What the editor keeps the cursor out of, measured from the edges of the part in view. */
  keepClear: KeepClear;
};

/**
 * Where the bands go when `pushedOut` pixels of the page are above the part
 * in view and `covered` pixels are below it, as with the on-screen keyboard;
 * both are 0 while the whole window shows. Once the keyboard covers more
 * than the home indicator, the footer sits on the keyboard with its home
 * indicator room behind it. On iOS the cursor's position is measured from
 * the part in view too, so the editor's bands do not move with `pushedOut`.
 */
export function keyboardBands(
  pushedOut: number,
  covered: number,
  insetTop: number,
  insetBottom: number,
): KeyboardBands {
  const keyboardUp = covered > insetBottom;
  const footerShown = keyboardUp ? BANDS.bottom : BANDS.bottom + insetBottom;
  return {
    headerTop: pushedOut,
    footerBottom: keyboardUp ? covered - insetBottom : 0,
    keepClear: {
      top: BANDS.top + insetTop,
      bottom: footerShown,
    },
  };
}
