import { useEffect, useState } from "react";

import { showSecretKey } from "../../../../../../../../../lib/vault/commands";
import { errorText } from "../../../../../../../../../lib/vault/errorText";
import { toHushError } from "../../../../../../../../../lib/vault/hushError";

type Read = { secretKey: string } | { error: string };

export type UseSecretKey = {
  loading: boolean;
  secretKey: string | null;
  error: string | null;
};

/** The vault's Secret Key, read from the keychain each time it is shown. */
export function useSecretKey(): UseSecretKey {
  const [read, setRead] = useState<Read | null>(null);

  useEffect(() => {
    let ignore = false;
    void showSecretKey().then(
      (secretKey) => {
        if (!ignore) setRead({ secretKey });
      },
      (failure: unknown) => {
        if (!ignore) setRead({ error: errorText(toHushError(failure).kind) });
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  return {
    loading: read === null,
    secretKey: read && "secretKey" in read ? read.secretKey : null,
    error: read && "error" in read ? read.error : null,
  };
}
