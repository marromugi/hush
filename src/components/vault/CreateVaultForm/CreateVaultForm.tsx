import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

import type { CreateVaultFormProps } from "./type";
import { useCreateVaultForm } from "./useCreateVaultForm";

export function CreateVaultForm({ busy, error, onCreate }: CreateVaultFormProps) {
  const { register, passphraseError, confirmError, handleSubmit } = useCreateVaultForm(
    onCreate,
    error,
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h1 className="text-lg">日記帳を作る</h1>
      <p>パスフレーズを忘れると、日記は二度と開けません。</p>
      <TextField
        {...register("passphrase")}
        label="パスフレーズ"
        type="password"
        autoComplete="new-password"
        error={passphraseError}
      />
      <TextField
        {...register("confirm")}
        label="もう一度"
        type="password"
        autoComplete="new-password"
        error={confirmError}
      />
      <Button type="submit" disabled={busy}>
        作る
      </Button>
    </form>
  );
}
