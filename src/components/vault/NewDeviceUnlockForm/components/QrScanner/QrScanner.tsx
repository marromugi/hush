import { Button } from "@/components/ui/Button";

import { useQrScanner } from "./hooks/useQrScanner";
import type { QrScannerProps } from "./type";

/** The camera, reading QR codes. Mount it only while reading. */
export function QrScanner({ onFound, onCancel }: QrScannerProps) {
  const { attachVideo, error } = useQrScanner(onFound);

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : (
        <video
          ref={attachVideo}
          muted
          playsInline
          aria-label="カメラの映像"
          className="aspect-video w-full rounded-md bg-black object-cover"
        />
      )}
      <Button type="button" tone="neutral" onClick={onCancel}>
        やめる
      </Button>
    </div>
  );
}
