import { TEXT_RANGES } from "@/lib/settings/settings";
import type { TextSettings } from "@/lib/settings/settings";

/** Which text setting a pinch changes. */
export type PinchAxis = keyof TextSettings;

/** How far, in pixels, the fingers move apart or together for each step of a setting. */
const STEP_PX = 16;

/**
 * The setting the fingers' line picks when they land: within 30 degrees of
 * level, the space between letters; within 30 of upright, the space between
 * lines; anything between, the size.
 */
export function axisOf(dx: number, dy: number): PinchAxis {
  const degrees = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  if (degrees < 30) return "letterSpacing";
  if (degrees > 60) return "lineHeight";
  return "size";
}

/** How far apart the fingers are, measured along what the axis changes. */
export function spreadOf(axis: PinchAxis, dx: number, dy: number): number {
  if (axis === "letterSpacing") return Math.abs(dx);
  if (axis === "lineHeight") return Math.abs(dy);
  return Math.hypot(dx, dy);
}

/** Where a pinch stands: the setting's value, and the spread that counts as no change. */
export type PinchStep = { value: number; from: number };

/**
 * The setting after the fingers went from `from` to `to` apart: a step for
 * every STEP_PX, kept inside its range. Past either end, `from` moves along
 * with the fingers, so turning back changes the value at once.
 */
export function valueAt(axis: PinchAxis, start: number, from: number, to: number): PinchStep {
  const range = TEXT_RANGES[axis];
  const steps = Math.round((to - from) / STEP_PX);
  const wanted = start + steps * range.step;
  const value = Math.min(range.max, Math.max(range.min, wanted));
  const moved = wanted === value ? from : to - ((value - start) / range.step) * STEP_PX;
  // Back onto the step's grid, so 1.6 + 0.1 reads as 1.7 and not 1.7000000000000002.
  return { value: Number(value.toFixed(2)), from: moved };
}
