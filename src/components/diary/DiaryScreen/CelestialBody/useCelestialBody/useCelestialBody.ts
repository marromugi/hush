import { useEffect, useRef, useSyncExternalStore } from "react";
import type { RefObject } from "react";

import type { Body } from "@/components/diary/DiaryScreen/weekdayBody";
import { REDUCED_MOTION_QUERY, reducesMotion } from "@/lib/ui/reducesMotion";

import { drawBody } from "./drawBody";

function onMotionSettingChange(onChange: () => void): () => void {
  const list = window.matchMedia(REDUCED_MOTION_QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/**
 * A canvas ref that shows `body` turning in 3D, drawn with WebGL. It stands
 * still while the person asks for less motion, from the moment they do.
 */
export function useCelestialBody(body: Body): RefObject<HTMLCanvasElement | null> {
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = useSyncExternalStore(onMotionSettingChange, reducesMotion, () => false);
  useEffect(() => {
    return canvas.current ? drawBody(canvas.current, body, still) : undefined;
  }, [body, still]);
  return canvas;
}
