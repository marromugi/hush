import { clsx } from "clsx";
import { MotionConfig, motion } from "motion/react";

import { quickMove } from "@/lib/ui/quickMove";

import type { ImageFrameProps } from "./type";
import { useWidthDrag } from "./useWidthDrag";

/**
 * The box an entry's image sits in, at its width and alignment. With
 * `onResize`, a grip on its edge resizes it by dragging: the right edge, or
 * the left one for a right-aligned image. Changing the alignment slides the
 * box to its new place; anything else moves it at once.
 */
export function ImageFrame({ width, align, onResize, children }: ImageFrameProps) {
  const { setFrame, shownWidth, grip } = useWidthDrag(width, align, onResize ?? (() => {}));

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={setFrame}
        layout="position"
        layoutDependency={align}
        transition={{ layout: quickMove }}
        className={clsx(
          // layout
          "relative",
          // size: a given width is filled; without one, the box fits the picture once it is in
          shownWidth === null ? "max-w-full has-[img]:w-fit" : "[&>img]:w-full",
          // spacing
          align === "center" && "mx-auto",
          align === "right" && "ml-auto",
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
              "absolute top-1/2 -translate-y-1/2",
              align === "right" ? "-left-3" : "-right-3",
              // size: wider than it looks, to be easy to catch
              "flex h-12 w-4 items-center justify-center",
              // interaction
              "cursor-ew-resize touch-none",
            )}
          >
            <span className="h-10 w-1 rounded-full bg-current/40" />
          </span>
        ) : null}
      </motion.div>
    </MotionConfig>
  );
}
