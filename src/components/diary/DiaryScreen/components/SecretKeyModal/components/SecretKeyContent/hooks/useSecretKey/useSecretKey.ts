import { usePromise } from "@/hooks/common/usePromise";
import { showSecretKey } from "@/lib/vault/commands";
import { errorText } from "@/lib/vault/errorText";
import { toHushError } from "@/lib/vault/hushError";

export type UseSecretKey = {
  loading: boolean;
  secretKey: string | null;
  error: string | null;
};

/** The vault's Secret Key, read from the keychain each time it is shown. */
export function useSecretKey(): UseSecretKey {
  const read = usePromise(showSecretKey);

  return {
    loading: read.status === "loading",
    secretKey: read.status === "done" ? read.value : null,
    error: read.status === "failed" ? errorText(toHushError(read.error).kind) : null,
  };
}
