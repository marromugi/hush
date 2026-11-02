import { SecretKeyCard } from "../../../../../../vault/SecretKeyCard";
import { useSecretKey } from "./hooks/useSecretKey";

/** The vault's Secret Key, read when this is shown. */
export function SecretKeyContent() {
  const read = useSecretKey();

  return (
    <div className="flex flex-col gap-4">
      <p>ほかの端末で日記帳を開くときに、パスフレーズと一緒に要ります。</p>
      {read.error ? (
        <p role="alert" className="text-sm text-error">
          {read.error}
        </p>
      ) : null}
      {read.secretKey === null ? null : <SecretKeyCard secretKey={read.secretKey} />}
    </div>
  );
}
