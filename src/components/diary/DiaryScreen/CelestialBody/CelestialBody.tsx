import type { CelestialBodyProps } from "./type";
import { useCelestialBody } from "./useCelestialBody";

/** The body, as small as the date beside it. It only decorates, so it is hidden from screen readers. */
export function CelestialBody({ body }: CelestialBodyProps) {
  const canvas = useCelestialBody(body);
  return <canvas ref={canvas} aria-hidden className="size-4" />;
}
