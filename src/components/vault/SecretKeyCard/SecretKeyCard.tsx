import { clsx } from "clsx";

import { QrCode } from "@/components/ui/QrCode";

import type { SecretKeyCardProps } from "./type";

/** A Secret Key as another device takes it: a QR code to read, and text to type. */
export function SecretKeyCard({ secretKey }: SecretKeyCardProps) {
  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
