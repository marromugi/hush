import type { HushError } from "@/lib/vault/hushError";

export type UnlockFormProps = {
  /** True while an unlock runs; the button is disabled. */
  busy: boolean;
  error: HushError | null;
  onUnlock: (passphrase: string) => Promise<void>;
};
