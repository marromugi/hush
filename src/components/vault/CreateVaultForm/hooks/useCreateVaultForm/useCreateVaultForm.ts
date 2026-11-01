import { useState } from "react";
import type { FormEvent } from "react";

import { readField } from "../../../../../lib/ui/readField";
import { errorText } from "../../../../../lib/vault/errorText";
import type { HushError } from "../../../../../lib/vault/hushError";

export type UseCreateVaultForm = {
  /** The error from creating, hidden while the two passphrases differ. */
  passphraseError: string | undefined;
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

  return {
    passphraseError: !mismatch && error ? errorText(error.kind) : undefined,
    confirmError: mismatch ? "パスフレーズが一致しません。" : undefined,
    handleSubmit,
  };
}
