import { usePromise } from "@/hooks/common/usePromise";
import { toastError } from "@/lib/ui/toast";
import { showSecretKey } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";

export type UseSecretKey = {
  loading: boolean;
  /** `null` while it is read, or when it cannot be, which a toast says. */
  secretKey: string | null;
};

/** The vault's Secret Key, read from the keychain each time it is shown. */
export function useSecretKey(): UseSecretKey {
  const read = usePromise(showSecretKey, null, (failure) => toastError(failureText(failure)));

  return {
    loading: read.status === "loading",
    secretKey: read.status === "done" ? read.value : null,
  };
}
