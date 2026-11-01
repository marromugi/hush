import { useEffect, useState } from "react";

import { createVault, lockVault, unlockVault, vaultStatus } from "../../../lib/vault/commands";
import type { VaultStatus } from "../../../lib/vault/commands";
import { toHushError } from "../../../lib/vault/hushError";
import type { HushError } from "../../../lib/vault/hushError";

export type UseVault = {
  /** `loading` until the first status arrives from the Rust side. */
  status: VaultStatus | "loading";
  /** True while a create, unlock, or lock is running. */
  busy: boolean;
  error: HushError | null;
  create: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => Promise<void>;
};

export function useVault(): UseVault {
  const [status, setStatus] = useState<VaultStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HushError | null>(null);

  useEffect(() => {
    let ignore = false;
    void vaultStatus().then(
      (current) => {
        if (!ignore) setStatus(current);
      },
      (failure: unknown) => {
        if (!ignore) setError(toHushError(failure));
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  async function run(action: () => Promise<void>, next: VaultStatus) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setStatus(next);
    } catch (failure) {
      setError(toHushError(failure));
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    busy,
    error,
    create: (passphrase) => run(() => createVault(passphrase), "unlocked"),
    unlock: (passphrase) => run(() => unlockVault(passphrase), "unlocked"),
    lock: () => run(lockVault, "locked"),
  };
}
