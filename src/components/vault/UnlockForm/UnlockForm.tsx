import { readField } from "../../../lib/ui/readField";
import { errorText } from "../../../lib/vault/errorText";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";
import type { UnlockFormProps } from "./type";

export function UnlockForm({ busy, error, onUnlock }: UnlockFormProps) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onUnlock(readField(event.currentTarget, "passphrase"));
      }}
    >
      <h1 className="text-lg">日記帳を開く</h1>
      <TextField
        name="passphrase"
        label="パスフレーズ"
        type="password"
        autoComplete="current-password"
        error={error ? errorText(error.kind) : undefined}
      />
      <Button type="submit" disabled={busy}>
        開く
      </Button>
    </form>
  );
}
