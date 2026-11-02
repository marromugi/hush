import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { errorText } from "@/lib/vault/errorText";
import { isAboutPassphrase } from "@/lib/vault/hushError";

import { QrScanner } from "./components/QrScanner";
import { useNewDeviceUnlockForm } from "./hooks/useNewDeviceUnlockForm";
import type { NewDeviceUnlockFormProps } from "./type";

/** Opens the vault on a device that does not have its Secret Key yet. */
export function NewDeviceUnlockForm({ busy, error, onUnlock }: NewDeviceUnlockFormProps) {
  const form = useNewDeviceUnlockForm(onUnlock);

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit}>
      <h1 className="text-lg">この端末で日記帳を開く</h1>
      <p>
        はじめての端末では、パスフレーズと一緒に Secret Key が要ります。Secret Key
        は、ほかの端末に出した QR コードからも読み取れます。
      </p>
      <TextField
        {...form.register("secretKey")}
        label="Secret Key"
        type="text"
        autoComplete="off"
        error={error?.kind === "invalidSecretKey" ? errorText(error.kind) : undefined}
      />
      {form.scanning ? (
        <QrScanner onFound={form.onScanned} onCancel={form.stopScan} />
      ) : (
        <Button type="button" tone="neutral" onClick={form.startScan}>
          QR コードで読み取る
        </Button>
      )}
      <TextField
        {...form.register("passphrase")}
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
