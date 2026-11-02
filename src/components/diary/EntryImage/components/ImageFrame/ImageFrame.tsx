import { clsx } from "clsx";

import { useWidthDrag } from "./hooks/useWidthDrag";
import type { ImageFrameProps } from "./type";

/**
 * The box an entry's image sits in, at its width. With `onResize`, a grip on
 * its right edge resizes it by dragging.
 */
export function ImageFrame({ width, onResize, children }: ImageFrameProps) {
  const { setFrame, shownWidth, grip } = useWidthDrag(width, onResize ?? (() => {}));

  return (
    <div
      ref={setFrame}
      className={clsx(
        // layout
        "relative",
        // size: a given width is filled; without one, the box fits the picture once it is in
        shownWidth === null ? "max-w-full has-[img]:w-fit" : "[&>img]:w-full",
      )}
      style={shownWidth === null ? undefined : { width: `${shownWidth}%` }}
    >
      {children}
      {onResize ? (
        <span
          aria-hidden="true"
          {...grip}
          onLostPointerCapture={grip.onPointerCancel}
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
      ) : null}
    </div>
  );
}
