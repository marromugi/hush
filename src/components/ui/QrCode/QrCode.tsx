import { useMemo } from "react";

import { qrModules } from "@/lib/ui/qr";

import { qrCode } from "./style";
import type { QrCodeProps } from "./type";

/** `text` as a QR code, one square per module. */
export function QrCode({ text, label }: QrCodeProps) {
  const modules = useMemo(() => qrModules(text), [text]);

  return (
    <svg
      viewBox={`0 0 ${modules.length} ${modules.length}`}
      shapeRendering="crispEdges"
      className={qrCode()}
    >
      <title>{label}</title>
      {modules.map((row, y) =>
        row.map((dark, x) =>
          dark ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}
