import { useSafeAreaInset } from "@/components/diary/DiaryScreen/useSafeAreaInset";
import { useMedia } from "@/hooks/common/useMedia";

/** The sticky header and footer, in pixels, before the safe-area insets. Must match their heights in `DiaryScreen`. */
const BANDS = { narrow: { top: 60, bottom: 80 }, wide: { top: 84, bottom: 104 } };

/** The fade below the header, in pixels. Must match its height in `DiaryScreen`. */
const FADE = 32;

/**
 * The bar of tools above the footer and the gap under it, in pixels. Must
 * match their size, and the room at the entry's end, in `DiaryScreen`. Below
 * md the bar covers the entry's right edge; from md the entry stops short of it.
 */
const TOOLS = 52;

/** The room at the top and bottom of the window, in pixels, that the header, footer, and bar of tools cover and the cursor must stay out of. */
export function useKeepClear(): { top: number; bottom: number } {
  const insetTop = useSafeAreaInset("top");
  const insetBottom = useSafeAreaInset("bottom");
  const wide = useMedia("md");
  const bands = wide ? BANDS.wide : BANDS.narrow;
  return {
    top: bands.top + FADE + insetTop,
    bottom: bands.bottom + (wide ? 0 : TOOLS) + insetBottom,
  };
}
