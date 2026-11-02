import { clsx } from "clsx";

import { useWidthDrag } from "./hooks/useWidthDrag";
import type { ImageGripProps } from "./type";

/** The image with a grip on its right edge that resizes it by dragging. */
export function ImageGrip({ width, onResize, children }: ImageGripProps) {
  const { setFrame, shownWidth, grip } = useWidthDrag(width, onResize);

  return (
    <div
      ref={setFrame}
      className={clsx(
        // layout
        "relative",
        // size: its own size when no width is given, so the grip sits on the picture's edge
        shownWidth === null && "w-fit max-w-full",
      )}
      style={shownWidth === null ? undefined : { width: `${shownWidth}%` }}
    >
      {children}
      <span
        aria-hidden="true"
        {...grip}
        className={clsx(
          // layout
          "absolute top-1/2 -right-3 -translate-y-1/2",
          // size: wider than it looks, to be easy to catch
          "flex h-12 w-4 items-center justify-center",
          // interaction
          "cursor-ew-resize touch-none",
        )}
      >
        <span className="h-10 w-1 rounded-full bg-current/40" />
      </span>
    </div>
  );
}
