import { useSafeAreaInset } from "@/components/diary/DiaryScreen/useSafeAreaInset";
import { useMedia } from "@/hooks/common/useMedia";

/** The sticky header and footer, in pixels, before the safe-area insets. Must match their heights in `DiaryScreen`. */
const BANDS = { narrow: { top: 60, bottom: 80 }, wide: { top: 84, bottom: 104 } };

/** The fade below the header, in pixels. Must match its height in `DiaryScreen`. */
const FADE = 32;

/**
 * The row of the writing tools above the footer, in pixels. Must match its
 * height, and the room at the entry's end, in `DiaryScreen`.
 */
const TOOLS = 48;

/** The room at the top and bottom of the window, in pixels, that the header, footer, and row of the writing tools cover and the cursor must stay out of. */
export function useKeepClear(): { top: number; bottom: number } {
  const insetTop = useSafeAreaInset("top");
  const insetBottom = useSafeAreaInset("bottom");
  const wide = useMedia("md");
  const bands = wide ? BANDS.wide : BANDS.narrow;
  return {
    top: bands.top + FADE + insetTop,
    bottom: bands.bottom + TOOLS + insetBottom,
  };
}
