import { selectionFeedback } from "@tauri-apps/plugin-haptics";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";

import { useMedia } from "@/hooks/common/useMedia";
import type { TextSettings } from "@/lib/settings/settings";

import { DRAG_SLOP, dragAxis, dragDistance, valueAt } from "./gesture";
import type { GestureAxis } from "./gesture";

type Point = { x: number; y: number };

/** The gesture in progress: what it changes, where it started from, and the value it last set. */
type Gesture = { axis: GestureAxis; start: number; from: number; value: number };

export type UseTextGestures = {
  /** The setting a finger is changing now; null when none is. */
  axis: GestureAxis | null;
  /** Whether the gestures work: only below md, where there are no sliders. */
  on: boolean;
  /** Spread onto the sample the fingers move over. */
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
 * Fingers on the sample change the text settings. One finger dragged
 * across changes the space between letters, and up and down the space
 * between lines; which, is read once it has moved DRAG_SLOP. Two fingers
 * pinched change the size. Each changes a step at a time. From md up the
 * sliders do this instead.
 */
export function useTextGestures(
  text: TextSettings,
  change: (name: GestureAxis, value: number) => void,
): UseTextGestures {
  const points = useRef(new Map<number, Point>());
  /** Where the one finger of a drag came down. */
  const origin = useRef<Point | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const [axis, setAxis] = useState<GestureAxis | null>(null);
  const on = !useMedia("md");

  const begin = (picked: GestureAxis, from: number) => {
    const start = text[picked];
    gesture.current = { axis: picked, start, from, value: start };
    setAxis(picked);
  };

  /** The distance the current gesture measures: the drag's way along its axis, or the pinch's spread. */
  const distance = (current: Gesture): number => {
    const [a, b] = [...points.current.values()];
    if (current.axis === "size") return Math.hypot(b.x - a.x, b.y - a.y);
    return dragDistance(
      current.axis,
      a.x - (origin.current?.x ?? a.x),
      a.y - (origin.current?.y ?? a.y),
    );
  };

  const end = (event: PointerEvent) => {
    if (!points.current.delete(event.pointerId)) return;
    // Any finger lifting ends the gesture; the next one starts afresh.
    points.current.clear();
    origin.current = null;
    gesture.current = null;
    setAxis(null);
  };

  return {
    axis,
    on,
    handlers: {
      onPointerDown: (event) => {
        if (!on || event.pointerType !== "touch" || points.current.size >= 2) return;
        const point = { x: event.clientX, y: event.clientY };
        points.current.set(event.pointerId, point);
        if (points.current.size === 1) {
          origin.current = point;
          return;
        }
        // A second finger turns whatever the first was doing into a pinch.
        const [a, b] = [...points.current.values()];
        begin("size", Math.hypot(b.x - a.x, b.y - a.y));
      },
      onPointerMove: (event) => {
        if (!points.current.has(event.pointerId)) return;
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const at = origin.current;
        if (!gesture.current && at && points.current.size === 1) {
          const dx = event.clientX - at.x;
          const dy = event.clientY - at.y;
          if (Math.hypot(dx, dy) < DRAG_SLOP) return;
          begin(dragAxis(dx, dy), 0);
        }
        const current = gesture.current;
        if (!current) return;
        const next = valueAt(current.axis, current.start, current.from, distance(current));
        current.from = next.from;
        // Compared with the value this gesture last set, not the rendered one, which may not have caught up yet.
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
