import { useState } from "react";
import type { FormEvent } from "react";

import { readField } from "../../../../../lib/ui/readField";

export type UseCreateVaultForm = {
  /** True after a submit where the two passphrases differed. */
  mismatch: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** Creates only when the passphrase was typed the same way twice. */
export function useCreateVaultForm(
  onCreate: (passphrase: string) => Promise<void>,
): UseCreateVaultForm {
  const [mismatch, setMismatch] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passphrase = readField(event.currentTarget, "passphrase");
    const matches = passphrase === readField(event.currentTarget, "confirm");
    setMismatch(!matches);
    if (matches) void onCreate(passphrase);
  }

  return { mismatch, handleSubmit };
}
