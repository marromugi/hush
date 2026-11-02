import { useEffect, useState } from "react";

import { useSingleFlight } from "@/hooks/common/useSingleFlight";
import { createVault, lockVault, unlockVault, vaultStatus } from "@/lib/vault/commands";
import type { VaultStatus } from "@/lib/vault/commands";
import { toHushError } from "@/lib/vault/hushError";
import type { HushError } from "@/lib/vault/hushError";

export type UseVault = {
  /** `loading` until the first status arrives from the Rust side. */
  status: VaultStatus | "loading";
  /** True while a create, unlock, or lock is running. */
  busy: boolean;
  error: HushError | null;
  /** The Secret Key of the vault just created, until the person has kept it. */
  newSecretKey: string | null;
  create: (passphrase: string) => Promise<void>;
  /** Call once the person has kept `newSecretKey`. */
  keptSecretKey: () => void;
  /** `secretKey` only on a device that does not have it yet. */
  unlock: (passphrase: string, secretKey?: string) => Promise<void>;
  lock: () => Promise<void>;
};

export function useVault(): UseVault {
  const [status, setStatus] = useState<VaultStatus | "loading">("loading");
  const [error, setError] = useState<HushError | null>(null);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    void vaultStatus().then(
      (current) => {
        // An action that finished first knows better than this first reply.
        if (!ignore) setStatus((shown) => (shown === "loading" ? current : shown));
      },
      (failure: unknown) => {
        if (!ignore) setError(toHushError(failure));
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  // A second call while one is running is ignored, as from a double click.
  const { run, running: busy } = useSingleFlight(
    async (action: () => Promise<void>, next: VaultStatus) => {
      setError(null);
      try {
        await action();
        setStatus(next);
      } catch (failure) {
        const failed = toHushError(failure);
        setError(failed);
        // The device lost the vault's Secret Key, or never kept it: ask for it.
        if (failed.kind === "noSecretKey") setStatus("needsSecretKey");
      }
    },
  );

  return {
    status,
    busy,
    error,
    newSecretKey,
    create: (passphrase) =>
      run(async () => setNewSecretKey(await createVault(passphrase)), "unlocked"),
    keptSecretKey: () => setNewSecretKey(null),
    unlock: (passphrase, secretKey) => run(() => unlockVault(passphrase, secretKey), "unlocked"),
    lock: () =>
      run(async () => {
        await lockVault();
        // A Secret Key still waiting to be kept is not shown again once locked.
        setNewSecretKey(null);
      }, "locked"),
  };
}
