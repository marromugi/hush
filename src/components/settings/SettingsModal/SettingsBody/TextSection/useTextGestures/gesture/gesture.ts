import { TEXT_RANGES } from "@/lib/settings/settings";
import type { TextSettings } from "@/lib/settings/settings";

/** Which text setting a gesture on the sample changes. */
export type GestureAxis = keyof TextSettings;

/** How far, in pixels, a finger moves for each step of a setting. */
const STEP_PX = 16;

/** How far, in pixels, one finger moves before its direction is read; shorter is a tap. */
export const DRAG_SLOP = 8;

/** The setting a one-finger drag changes: across, the space between letters; up and down, between lines. */
export function dragAxis(dx: number, dy: number): GestureAxis {
  return Math.abs(dx) >= Math.abs(dy) ? "letterSpacing" : "lineHeight";
}

/**
 * How far a drag has gone along what it changes: right and down count up,
 * so the letters spread to the right and the lines spread downward.
 */
export function dragDistance(axis: GestureAxis, dx: number, dy: number): number {
  return axis === "letterSpacing" ? dx : dy;
}

/** Where a gesture stands: the setting's value, and the distance that counts as no change. */
export type GestureStep = { value: number; from: number };

/**
 * The setting after a finger went from `from` to `to`: a step for each whole
 * STEP_PX, the same both ways, kept inside its range. Past either end, `from`
 * moves along with the finger, so turning back changes the value at once.
 */
export function valueAt(axis: GestureAxis, start: number, from: number, to: number): GestureStep {
  const range = TEXT_RANGES[axis];
  const steps = Math.trunc((to - from) / STEP_PX);
  const wanted = start + steps * range.step;
  const value = Math.min(range.max, Math.max(range.min, wanted));
  const moved = wanted === value ? from : to - ((value - start) / range.step) * STEP_PX;
  // Back onto the step's grid, so 1.6 + 0.1 reads as 1.7 and not 1.7000000000000002.
  return { value: Number(value.toFixed(2)), from: moved };
}
