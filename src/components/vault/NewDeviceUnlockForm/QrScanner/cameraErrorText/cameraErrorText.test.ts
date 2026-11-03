import { expect, test } from "vitest";

import { cameraErrorText } from "./cameraErrorText";

test("says how to allow the camera when it was refused", () => {
  expect(cameraErrorText(new DOMException("denied", "NotAllowedError"))).toBe(
    "カメラが許可されていません。システム設定で、hush にカメラを許可してください。",
  );
});

test("says when there is no camera, and gives a plain reason otherwise", () => {
  expect(cameraErrorText(new DOMException("none", "NotFoundError"))).toBe(
    "カメラが見つかりません。",
  );
  expect(cameraErrorText(new TypeError("no mediaDevices"))).toBe("カメラを使えませんでした。");
});
