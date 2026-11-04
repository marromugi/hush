import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { biometryName } from "@/lib/vault/biometryName";
import { errorText } from "@/lib/vault/errorText";
import { isAboutPassphrase } from "@/lib/vault/hushError";

import type { UnlockFormProps } from "./type";
import { useBiometryUnlock } from "./useBiometryUnlock";
import { useUnlockForm } from "./useUnlockForm";

export function UnlockForm({ busy, error, onUnlock, onUnlockWithBiometry }: UnlockFormProps) {
  const form = useUnlockForm(onUnlock);
  const biometry = useBiometryUnlock(onUnlockWithBiometry);

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
      <Button type="submit" disabled={busy}>
        開く
      </Button>
      {biometry.biometry === null ? null : (
        <Button type="button" tone="neutral" disabled={busy} onClick={biometry.ask}>
          {biometryName(biometry.biometry)} で開く
        </Button>
      )}
    </form>
  );
}
