import { Button } from "../../../../ui/Button";
import { SecretKeyCard } from "../../../../vault/SecretKeyCard";
import { useSecretKeyPanel } from "./hooks/useSecretKeyPanel";
import type { SecretKeyPanelProps } from "./type";

/** The vault's Secret Key, to keep again or to give another device. */
export function SecretKeyPanel({ onClose }: SecretKeyPanelProps) {
  const panel = useSecretKeyPanel();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg">Secret Key</h2>
      <p>ほかの端末で日記帳を開くときに、パスフレーズと一緒に要ります。</p>
      {panel.error ? (
        <p role="alert" className="text-sm text-error">
          {panel.error}
        </p>
      ) : null}
      {panel.secretKey === null ? null : <SecretKeyCard secretKey={panel.secretKey} />}
      <Button type="button" tone="neutral" onClick={onClose}>
        閉じる
      </Button>
    </div>
  );
}
