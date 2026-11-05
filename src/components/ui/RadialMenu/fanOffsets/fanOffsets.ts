export type Offset = { x: number; y: number };

/**
 * Where each of `count` items sits around the trigger's centre, in pixels:
 * on an arc of `radius` above it, `step` degrees apart, centred straight up.
 * `y` grows downward, as on screen.
 */
export function fanOffsets(count: number, radius: number, step: number): Offset[] {
  return Array.from({ length: count }, (_, index) => {
    const degrees = 90 + step * ((count - 1) / 2 - index);
    const radians = (degrees * Math.PI) / 180;
    return { x: round(radius * Math.cos(radians)), y: round(-radius * Math.sin(radians)) };
  });
}

/** Two decimals is finer than a pixel, and keeps `-0` and float noise out of the styles. */
function round(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}
