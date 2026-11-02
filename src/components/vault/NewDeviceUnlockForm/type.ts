import type { HushError } from "../../../lib/vault/hushError";

export type NewDeviceUnlockFormProps = {
  /** True while an unlock runs; the button is disabled. */
  busy: boolean;
  error: HushError | null;
  onUnlock: (passphrase: string, secretKey: string) => Promise<void>;
};
