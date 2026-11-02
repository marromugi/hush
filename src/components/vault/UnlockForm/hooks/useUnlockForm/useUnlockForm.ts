import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegister } from "react-hook-form";
import * as v from "valibot";

const schema = v.object({ passphrase: v.string() });

type Fields = v.InferInput<typeof schema>;

export type UseUnlockForm = {
  register: UseFormRegister<Fields>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function useUnlockForm(onUnlock: (passphrase: string) => Promise<void>): UseUnlockForm {
  const form = useForm<Fields>({
    resolver: valibotResolver(schema),
    defaultValues: { passphrase: "" },
  });

  return {
    register: form.register,
    handleSubmit: (event) =>
      void form.handleSubmit(({ passphrase }) => onUnlock(passphrase))(event),
  };
}
