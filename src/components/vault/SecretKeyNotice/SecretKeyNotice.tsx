import { clsx } from "clsx";

import { Button } from "../../ui/Button";
import { QrCode } from "../../ui/QrCode";
import type { SecretKeyNoticeProps } from "./type";

/** Shown once, right after a vault is made, so its Secret Key can be kept. */
export function SecretKeyNotice({ secretKey, onKept }: SecretKeyNoticeProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg">Secret Key を控えてください</h1>
      <p>ほかの端末で日記帳を開くときに、パスフレーズと一緒に要ります。</p>
      <p>なくすと、パスフレーズを覚えていても、ほかの端末では日記を開けません。</p>
      <p>ほかの端末では、この QR コードを読み取るか、下の文字を入れます。</p>
      <QrCode text={secretKey} label="Secret Key の QR コード" />
      <output
        className={clsx(
          // shape
          "rounded-md border border-edge px-4 py-3",
          // typography
          "font-mono text-lg tracking-wide break-all",
          // selection
          "select-all",
        )}
      >
        {secretKey}
      </output>
      <Button type="button" onClick={onKept}>
        控えました
      </Button>
    </div>
  );
}
