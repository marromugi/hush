import { useState } from "react";
import type { PointerEvent } from "react";

import { widthAt } from "@/lib/diary/imageWidth";

export type UseWidthDrag = {
  /** The ref for the element around the image; its parent is the entry's column. */
  setFrame: (element: HTMLDivElement | null) => void;
  /** The width to show: the one being dragged to, else `width`. */
  shownWidth: number | null;
  /** Handlers for the grip on the image's right edge. */
  grip: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
  };
};

/** Where a drag started: the image's left edge, how far the pointer was past its right edge, and the column's width. */
type Drag = { left: number; grabOffset: number; columnWidth: number };

/**
 * Dragging the grip with the main button resizes the image from its left
 * edge, in percent of the column. The width follows the pointer while
 * dragging and is handed to `onResize` once, when the pointer is let go, and
 * only if the pointer moved and the width changed.
 */
export function useWidthDrag(
  width: number | null,
  onResize: (width: number) => void,
): UseWidthDrag {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  function widthFor(from: Drag, pointerX: number): number {
    return widthAt(pointerX - from.grabOffset, from.left, from.columnWidth);
  }

  function end() {
    setDrag(null);
    setDragged(null);
  }

  return {
    setFrame,
    shownWidth: dragged ?? width,
    grip: {
      onPointerDown: (event) => {
        const column = frame?.parentElement;
        if (event.button !== 0 || !frame || !column || column.clientWidth === 0) return;
        // Without this the browser sends a mousedown, and the editor starts selecting or dragging the image.
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const box = frame.getBoundingClientRect();
        setDrag({
          left: box.left,
          grabOffset: event.clientX - box.right,
          columnWidth: column.clientWidth,
        });
      },
      onPointerMove: (event) => {
        if (drag) setDragged(widthFor(drag, event.clientX));
      },
      onPointerUp: (event) => {
        if (!drag) return;
        const next = widthFor(drag, event.clientX);
        const moved = dragged !== null;
        end();
        if (moved && next !== width) onResize(next);
      },
      onPointerCancel: end,
    },
  };
}
