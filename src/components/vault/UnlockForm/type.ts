import type { HushError } from "@/lib/vault/hushError";

export type UnlockFormProps = {
  /** True while an unlock runs; the button is disabled. */
  busy: boolean;
  error: HushError | null;
  onUnlock: (passphrase: string) => Promise<void>;
  /** Asks for Touch ID or Face ID, showing `reason` where the system has room for it. */
  onUnlockWithBiometry: (reason: string) => Promise<void>;
};
