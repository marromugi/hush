import { useEffect, useState } from "react";

import { toastError } from "@/lib/ui/toast";
import { biometryStatus, turnOffBiometry, turnOnBiometry } from "@/lib/vault/commands";
import type { BiometryStatus } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";

export type UseLockSection = {
  /** `null` until the Rust side has said what this device can do. */
  status: BiometryStatus | null;
  /** True while turning it on or off. */
  busy: boolean;
  /** Takes effect at once, on this device only. */
  setOn: (on: boolean) => void;
};

export function useLockSection(): UseLockSection {
  const [status, setStatus] = useState<BiometryStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    void biometryStatus().then(
      (current) => {
        if (!ignore) setStatus(current);
      },
      (failure: unknown) => {
        if (!ignore) toastError(failureText(failure));
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  return {
    status,
    busy,
    setOn: (on) => {
      setBusy(true);
      void (on ? turnOnBiometry() : turnOffBiometry())
        .then(
          () => setStatus((shown) => (shown === null ? shown : { ...shown, on })),
          (failure: unknown) => toastError(failureText(failure)),
        )
        .finally(() => setBusy(false));
    },
  };
}
