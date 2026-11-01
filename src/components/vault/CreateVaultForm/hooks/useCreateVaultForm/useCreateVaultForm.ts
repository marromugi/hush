import { useState } from "react";
import type { FormEvent } from "react";

import { readField } from "../../../../../lib/ui/readField";
import { errorText } from "../../../../../lib/vault/errorText";
import { isAboutPassphrase } from "../../../../../lib/vault/hushError";
import type { HushError } from "../../../../../lib/vault/hushError";

export type UseCreateVaultForm = {
  /** A failure to create caused by the passphrase. */
  passphraseError: string | undefined;
  /** A failure to create with any other cause. */
  formError: string | undefined;
  /** Set after a submit where the two passphrases differed. */
  confirmError: string | undefined;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** Creates only when the passphrase was typed the same way twice. */
export function useCreateVaultForm(
  onCreate: (passphrase: string) => Promise<void>,
  error: HushError | null,
): UseCreateVaultForm {
  const [mismatch, setMismatch] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passphrase = readField(event.currentTarget, "passphrase");
    const matches = passphrase === readField(event.currentTarget, "confirm");
    setMismatch(!matches);
    if (matches) void onCreate(passphrase);
  }

  // A mismatch means nothing was tried, so an error from an earlier try is stale.
  const shown = mismatch ? null : error;

  return {
    passphraseError: shown && isAboutPassphrase(shown.kind) ? errorText(shown.kind) : undefined,
    formError: shown && !isAboutPassphrase(shown.kind) ? errorText(shown.kind) : undefined,
    confirmError: mismatch ? "パスフレーズが一致しません。" : undefined,
    handleSubmit,
  };
}
