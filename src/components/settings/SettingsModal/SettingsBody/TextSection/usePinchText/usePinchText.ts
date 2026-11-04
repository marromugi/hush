import { selectionFeedback } from "@tauri-apps/plugin-haptics";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";

import { useMedia } from "@/hooks/common/useMedia";
import type { TextSettings } from "@/lib/settings/settings";

import { axisOf, spreadOf, valueAt } from "./pinch";
import type { PinchAxis } from "./pinch";

type Point = { x: number; y: number };

/** The pinch in progress: what it changes, where it started from, and the value it last set. */
type Pinch = { axis: PinchAxis; start: number; from: number; value: number };

export type UsePinchText = {
  /** The setting two fingers are changing now; null when none are down. */
  axis: PinchAxis | null;
  /** Whether pinching works: only below md, where there are no sliders. */
  on: boolean;
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
 * changes it a step at a time. From md up the sliders do this instead.
 */
export function usePinchText(
  text: TextSettings,
  change: (name: PinchAxis, value: number) => void,
): UsePinchText {
  const points = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | null>(null);
  const [axis, setAxis] = useState<PinchAxis | null>(null);
  const on = !useMedia("md");

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
    on,
    handlers: {
      onPointerDown: (event) => {
        if (!on || event.pointerType !== "touch" || points.current.size >= 2) return;
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (points.current.size < 2) return;
        const { dx, dy } = between();
        const picked = axisOf(dx, dy);
        const start = text[picked];
        pinch.current = { axis: picked, start, from: spreadOf(picked, dx, dy), value: start };
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
        current.from = next.from;
        // Compared with the value this pinch last set, not the rendered one, which may not have caught up yet.
        if (next.value === current.value) return;
        current.value = next.value;
        change(current.axis, next.value);
        tap();
      },
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
