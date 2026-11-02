import { readField } from "../../../lib/ui/readField";
import { errorText } from "../../../lib/vault/errorText";
import { isAboutPassphrase } from "../../../lib/vault/hushError";
import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";
import type { NewDeviceUnlockFormProps } from "./type";

/** Opens the vault on a device that does not have its Secret Key yet. */
export function NewDeviceUnlockForm({ busy, error, onUnlock }: NewDeviceUnlockFormProps) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onUnlock(
          readField(event.currentTarget, "passphrase"),
          readField(event.currentTarget, "secretKey"),
        );
      }}
    >
      <h1 className="text-lg">この端末で日記帳を開く</h1>
      <p>はじめての端末では、パスフレーズと一緒に Secret Key が要ります。</p>
      <TextField
        name="secretKey"
        label="Secret Key"
        type="text"
        autoComplete="off"
        error={error?.kind === "invalidSecretKey" ? errorText(error.kind) : undefined}
      />
      <TextField
        name="passphrase"
        label="パスフレーズ"
        type="password"
        autoComplete="current-password"
        error={error && isAboutPassphrase(error.kind) ? errorText(error.kind) : undefined}
      />
      {error && error.kind !== "invalidSecretKey" && !isAboutPassphrase(error.kind) ? (
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
