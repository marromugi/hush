import { useId } from "react";

import { errorText } from "../../../lib/vault/errorText";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { useCreateVaultForm } from "./hooks/useCreateVaultForm";
import type { CreateVaultFormProps } from "./type";

export function CreateVaultForm({ busy, error, onCreate }: CreateVaultFormProps) {
  const { mismatch, handleSubmit } = useCreateVaultForm(onCreate);
  const passphraseId = useId();
  const confirmId = useId();

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h1 className="text-lg">日記帳を作る</h1>
      <p>パスフレーズを忘れると、日記は二度と開けません。</p>
      <div className="flex flex-col gap-1">
        <label htmlFor={passphraseId}>パスフレーズ</label>
        <Input id={passphraseId} name="passphrase" type="password" autoComplete="new-password" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={confirmId}>もう一度</label>
        <Input id={confirmId} name="confirm" type="password" autoComplete="new-password" />
      </div>
      {mismatch ? (
        <p role="alert" className="text-danger">
          パスフレーズが一致しません。
        </p>
      ) : error ? (
        <p role="alert" className="text-danger">
          {errorText(error.kind)}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        作る
      </Button>
    </form>
  );
}
