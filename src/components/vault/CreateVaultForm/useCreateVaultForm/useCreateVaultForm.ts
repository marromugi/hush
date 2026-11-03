import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegister } from "react-hook-form";
import * as v from "valibot";

import { errorText } from "@/lib/vault/errorText";
import { isAboutPassphrase } from "@/lib/vault/hushError";
import type { HushError } from "@/lib/vault/hushError";

const schema = v.pipe(
  v.object({ passphrase: v.string(), confirm: v.string() }),
  v.forward(
    v.partialCheck(
      [["passphrase"], ["confirm"]],
      (input) => input.passphrase === input.confirm,
      "パスフレーズが一致しません。",
    ),
    ["confirm"],
  ),
);

type Fields = v.InferInput<typeof schema>;

export type UseCreateVaultForm = {
  register: UseFormRegister<Fields>;
  /** A failure to create caused by the passphrase. */
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
  const form = useForm<Fields>({
    resolver: valibotResolver(schema),
    defaultValues: { passphrase: "", confirm: "" },
    // A message stays until the next submit, not until the next keystroke.
    reValidateMode: "onSubmit",
    // Focus stays where the person submitted from.
    shouldFocusError: false,
  });
  const mismatch = form.formState.errors.confirm?.message;

  // A mismatch means nothing was tried, so an error from an earlier try is stale.
  const shown = mismatch === undefined ? error : null;

  return {
    register: form.register,
    passphraseError: shown && isAboutPassphrase(shown.kind) ? errorText(shown.kind) : undefined,
    confirmError: mismatch,
    handleSubmit: (event) =>
      void form.handleSubmit(({ passphrase }) => onCreate(passphrase))(event),
  };
}
