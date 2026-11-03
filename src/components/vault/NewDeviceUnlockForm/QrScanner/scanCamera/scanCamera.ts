import { cameraErrorText } from "@/components/vault/NewDeviceUnlockForm/QrScanner/cameraErrorText";
import { readQr } from "@/lib/ui/qr";

/**
 * Shows the camera in `video` and reads each frame until a QR code is found,
 * then calls `onFound` once. Returns a function that stops the camera.
 */
export function scanCamera(
  video: HTMLVideoElement,
  onFound: (text: string) => void,
  onError: (text: string) => void,
): () => void {
  let stopped = false;
  let frame = 0;
  let stream: MediaStream | null = null;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  function scan() {
    if (stopped || context === null) return;
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      const text = readQr(context.getImageData(0, 0, canvas.width, canvas.height));
      if (text !== null) {
        onFound(text);
        return;
      }
    }
    frame = requestAnimationFrame(scan);
  }

  // Through a promise, so a missing `mediaDevices` fails the same way as a refusal.
  void Promise.resolve()
    .then(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then(
      (started) => {
        stream = started;
        if (stopped) {
          started.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = started;
        // Stopping while it starts aborts the play; that is not a failure.
        video.play().catch((failure: unknown) => {
          if (!stopped) onError(cameraErrorText(failure));
        });
        frame = requestAnimationFrame(scan);
      },
      (failure: unknown) => {
        if (!stopped) onError(cameraErrorText(failure));
      },
    );

  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    stream?.getTracks().forEach((track) => track.stop());
  };
}
