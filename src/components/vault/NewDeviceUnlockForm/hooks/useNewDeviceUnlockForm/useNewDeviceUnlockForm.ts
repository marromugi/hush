import { valibotResolver } from "@hookform/resolvers/valibot";
import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegister } from "react-hook-form";
import * as v from "valibot";

const schema = v.object({ secretKey: v.string(), passphrase: v.string() });

type Fields = v.InferInput<typeof schema>;

export type UseNewDeviceUnlockForm = {
  register: UseFormRegister<Fields>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function useNewDeviceUnlockForm(
  onUnlock: (passphrase: string, secretKey: string) => Promise<void>,
): UseNewDeviceUnlockForm {
  const form = useForm<Fields>({
    resolver: valibotResolver(schema),
    defaultValues: { secretKey: "", passphrase: "" },
  });

  return {
    register: form.register,
    handleSubmit: (event) =>
      void form.handleSubmit(({ passphrase, secretKey }) => onUnlock(passphrase, secretKey))(event),
  };
}
