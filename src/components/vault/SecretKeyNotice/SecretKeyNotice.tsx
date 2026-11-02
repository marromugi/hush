import { useSession } from "../../../hooks/vault/useSession";
import { Button } from "../../ui/Button";
import { SecretKeyCard } from "../SecretKeyCard";
import type { SecretKeyNoticeProps } from "./type";

/** Shown once, right after a vault is made, so its Secret Key can be kept. Mount it inside `UnlockedSession`. */
export function SecretKeyNotice({ secretKey, onKept }: SecretKeyNoticeProps) {
  // The diary must not open while a lock runs.
  const { locking } = useSession();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg">Secret Key を控えてください</h1>
      <p>ほかの端末で日記帳を開くときに、パスフレーズと一緒に要ります。</p>
      <p>なくすと、パスフレーズを覚えていても、ほかの端末では日記を開けません。</p>
      <p>あとからでも、日記帳を開いて左下の config から見られます。</p>
      <SecretKeyCard secretKey={secretKey} />
      <Button type="button" disabled={locking} onClick={onKept}>
        控えました
      </Button>
    </div>
  );
}
