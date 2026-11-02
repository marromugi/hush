import { useEffect, useEffectEvent, useState } from "react";

import { scanCamera } from "../../lib/scanCamera";

export type UseQrScanner = {
  /** Give it as `ref` to the `<video>` that shows the camera. */
  attachVideo: (video: HTMLVideoElement | null) => void;
  /** Why the camera could not be started. */
  error: string | null;
};

/**
 * Reads QR codes from the camera while the video is on screen, and calls
 * `onFound` once with the first one. The camera stops when the video goes.
 */
export function useQrScanner(onFound: (text: string) => void): UseQrScanner {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const found = useEffectEvent(onFound);

  useEffect(
    () => (video === null ? undefined : scanCamera(video, (text) => found(text), setError)),
    [video],
  );

  return { attachVideo: setVideo, error };
}
