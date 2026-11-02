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
  };
};

type Drag = { left: number; columnWidth: number };

/**
 * Dragging the grip resizes the image from its left edge, in percent of the
 * column. The width follows the pointer while dragging and is handed to
 * `onResize` once, when the pointer is let go.
 */
export function useWidthDrag(
  width: number | null,
  onResize: (width: number) => void,
): UseWidthDrag {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  return {
    setFrame,
    shownWidth: dragged ?? width,
    grip: {
      onPointerDown: (event) => {
        const column = frame?.parentElement;
        if (!frame || !column) return;
        // The editor would otherwise start selecting or dragging the image.
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ left: frame.getBoundingClientRect().left, columnWidth: column.clientWidth });
      },
      onPointerMove: (event) => {
        if (!drag) return;
        setDragged(widthAt(event.clientX, drag.left, drag.columnWidth));
      },
      onPointerUp: (event) => {
        if (!drag) return;
        const next = widthAt(event.clientX, drag.left, drag.columnWidth);
        setDrag(null);
        setDragged(null);
        onResize(next);
      },
    },
  };
}
