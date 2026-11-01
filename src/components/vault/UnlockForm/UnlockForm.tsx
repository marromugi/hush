import { useId } from "react";

import { readField } from "../../../lib/ui/readField";
import { errorText } from "../../../lib/vault/errorText";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import type { UnlockFormProps } from "./type";

export function UnlockForm({ busy, error, onUnlock }: UnlockFormProps) {
  const passphraseId = useId();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onUnlock(readField(event.currentTarget, "passphrase"));
      }}
    >
      <h1 className="text-lg">日記帳を開く</h1>
      <div className="flex flex-col gap-1">
        <label htmlFor={passphraseId}>パスフレーズ</label>
        <Input
          id={passphraseId}
          name="passphrase"
          type="password"
          autoComplete="current-password"
        />
      </div>
      {error ? (
        <p role="alert" className="text-danger">
          {errorText(error.kind)}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        開く
      </Button>
    </form>
  );
}
