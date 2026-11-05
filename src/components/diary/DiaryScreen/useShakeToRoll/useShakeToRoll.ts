import { useEffect, useEffectEvent } from "react";

import { listenShakes } from "@/lib/vault/commands";

/** Calls `roll` each time the phone is shaken, while `enabled`. */
export function useShakeToRoll(roll: () => void, enabled: boolean): void {
  const onShake = useEffectEvent(() => {
    if (enabled) roll();
  });

  useEffect(() => {
    let stopped = false;
    let unlisten: (() => void) | undefined;
    void listenShakes(() => onShake())
      .then((stop) => {
        if (stopped) stop();
        else unlisten = stop;
      })
      // Outside the app, as in Storybook, there is no phone to hear from.
      .catch(() => {});
    return () => {
      stopped = true;
      unlisten?.();
    };
  }, []);
}
