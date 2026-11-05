import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { Body } from "@/components/diary/DiaryScreen/weekdayBody";

import { drawBody } from "./drawBody";

/** A canvas ref that shows `body` turning in 3D, drawn with WebGL. */
export function useCelestialBody(body: Body): RefObject<HTMLCanvasElement | null> {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    return canvas.current ? drawBody(canvas.current, body) : undefined;
  }, [body]);
  return canvas;
}
