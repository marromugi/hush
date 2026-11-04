import { useEffect, useEffectEvent, useState } from "react";

import { biometryStatus } from "@/lib/vault/commands";
import type { Biometry } from "@/lib/vault/commands";

/** Shown under "Touch ID" in the system prompt. */
const REASON = "日記帳を開きます。";

export type UseBiometryUnlock = {
  /** `null` unless the vault opens with Touch ID or Face ID on this device. */
  biometry: Biometry | null;
  /** Asks again, as after the person cancelled. */
  ask: () => void;
};

/**
 * Asks for Touch ID or Face ID whenever the locked screen comes to the front,
 * when the person has turned it on. The lock happens as the app goes to the
 * background, so the first chance is often only when it comes back.
 */
export function useBiometryUnlock(unlock: (reason: string) => Promise<void>): UseBiometryUnlock {
  const [biometry, setBiometry] = useState<Biometry | null>(null);
  const ask = useEffectEvent(() => {
    if (document.visibilityState === "visible") void unlock(REASON);
  });

  useEffect(() => {
    let ignore = false;
    const onVisibilityChange = () => ask();
    void biometryStatus().then(
      (status) => {
        if (ignore || !status.on || status.biometry === null) return;
        setBiometry(status.biometry);
        ask();
        document.addEventListener("visibilitychange", onVisibilityChange);
      },
      // Without it the passphrase still opens the vault.
      () => {},
    );
    return () => {
      ignore = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return { biometry, ask: () => void unlock(REASON) };
}
