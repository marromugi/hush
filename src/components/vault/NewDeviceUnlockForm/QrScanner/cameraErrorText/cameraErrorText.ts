/** What to tell the person when the camera could not be started. */
export function cameraErrorText(failure: unknown): string {
  const name = failure instanceof Error ? failure.name : "";
  if (name === "NotAllowedError") {
    return "カメラが許可されていません。システム設定で、hush にカメラを許可してください。";
  }
  if (name === "NotFoundError") return "カメラが見つかりません。";
  return "カメラを使えませんでした。";
}
