import { useSafeAreaInset } from "@/components/diary/DiaryScreen/useSafeAreaInset";
import { useWide } from "@/components/diary/DiaryScreen/useWide";

/** The sticky header and footer, in pixels, before the safe-area insets. Must match their heights in `DiaryScreen`. */
const BANDS = { narrow: { top: 60, bottom: 80 }, wide: { top: 84, bottom: 104 } };

/** The room at the top and bottom of the window, in pixels, that the header and footer cover and the cursor must stay out of. */
export function useKeepClear(): { top: number; bottom: number } {
  const insetTop = useSafeAreaInset("top");
  const insetBottom = useSafeAreaInset("bottom");
  const bands = useWide() ? BANDS.wide : BANDS.narrow;
  return { top: bands.top + insetTop, bottom: bands.bottom + insetBottom };
}
