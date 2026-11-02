import type { HushError } from "@/lib/vault/hushError";

export type CreateVaultFormProps = {
  /** True while the vault is being created; the button is disabled. */
  busy: boolean;
  error: HushError | null;
  onCreate: (passphrase: string) => Promise<void>;
};
