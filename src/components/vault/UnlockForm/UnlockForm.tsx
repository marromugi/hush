import { errorText } from "../../../lib/vault/errorText";
import { isAboutPassphrase } from "../../../lib/vault/hushError";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";
import { useUnlockForm } from "./hooks/useUnlockForm";
import type { UnlockFormProps } from "./type";

export function UnlockForm({ busy, error, onUnlock }: UnlockFormProps) {
  const form = useUnlockForm(onUnlock);

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
      <h1 className="text-lg">日記帳を開く</h1>
      <TextField
        {...form.register("passphrase")}
        label="パスフレーズ"
        type="password"
        autoComplete="current-password"
        error={error && isAboutPassphrase(error.kind) ? errorText(error.kind) : undefined}
      />
      {error && !isAboutPassphrase(error.kind) ? (
        <p role="alert" className="text-sm text-error">
          {errorText(error.kind)}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        開く
      </Button>
    </form>
  );
}
