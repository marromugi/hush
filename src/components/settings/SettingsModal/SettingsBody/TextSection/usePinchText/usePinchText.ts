import { selectionFeedback } from "@tauri-apps/plugin-haptics";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";

import type { TextSettings } from "@/lib/settings/settings";

import { axisOf, spreadOf, valueAt } from "./pinch";
import type { PinchAxis } from "./pinch";

type Point = { x: number; y: number };

/** The pinch in progress: what it changes, and where it started from. */
type Pinch = { axis: PinchAxis; start: number; from: number };

export type UsePinchText = {
  /** The setting two fingers are changing now; null when none are down. */
  axis: PinchAxis | null;
  /** Spread onto the sample the fingers pinch. */
  handlers: {
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: (event: PointerEvent) => void;
  };
};

/** Each change is felt as a light tap; there is nothing to feel on the desktop or outside the app. */
function tap() {
  selectionFeedback().catch(() => {});
}

/**
 * Two fingers on the sample change one text setting: the angle between them
 * when the second lands picks which, and moving them apart or together
 * changes it a step at a time.
 */
export function usePinchText(
  text: TextSettings,
  change: (name: PinchAxis, value: number) => void,
): UsePinchText {
  const points = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | null>(null);
  const [axis, setAxis] = useState<PinchAxis | null>(null);

  const between = () => {
    const [a, b] = [...points.current.values()];
    return { dx: b.x - a.x, dy: b.y - a.y };
  };

  const end = (event: PointerEvent) => {
    points.current.delete(event.pointerId);
    if (points.current.size < 2 && pinch.current) {
      pinch.current = null;
      setAxis(null);
    }
  };

  return {
    axis,
    handlers: {
      onPointerDown: (event) => {
        if (event.pointerType !== "touch" || points.current.size >= 2) return;
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (points.current.size < 2) return;
        const { dx, dy } = between();
        const picked = axisOf(dx, dy);
        pinch.current = { axis: picked, start: text[picked], from: spreadOf(picked, dx, dy) };
        setAxis(picked);
      },
      onPointerMove: (event) => {
        if (!points.current.has(event.pointerId)) return;
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const current = pinch.current;
        if (!current) return;
        const { dx, dy } = between();
        const next = valueAt(
          current.axis,
          current.start,
          current.from,
          spreadOf(current.axis, dx, dy),
        );
        if (next === text[current.axis]) return;
        tap();
        change(current.axis, next);
      },
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
