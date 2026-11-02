import { afterEach, expect, test } from "vitest";

import { scanCamera } from "./scanCamera";

const realMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");

afterEach(() => {
  if (realMediaDevices) Object.defineProperty(navigator, "mediaDevices", realMediaDevices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
});

/** A camera that starts when told to, and records when its track stops. */
function fakeCamera(start: () => Promise<unknown>) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: start },
    configurable: true,
  });
}

/** A video that takes any stream, since the fake one is not a real `MediaStream`. */
function fakeVideo() {
  const video = document.createElement("video");
  Object.defineProperty(video, "srcObject", { set: () => {}, configurable: true });
  Object.defineProperty(video, "play", { value: async () => {}, configurable: true });
  return video;
}

function fakeStream(log: string[]) {
  return { getTracks: () => [{ stop: () => log.push("stopped") }] };
}

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("stopping while the camera starts stops it as soon as it has started", async () => {
  const log: string[] = [];
  let started: ((stream: unknown) => void) | undefined;
  fakeCamera(
    () =>
      new Promise((resolve) => {
        started = resolve;
      }),
  );
  const stop = scanCamera(
    fakeVideo(),
    () => {},
    () => {},
  );
  await settle();
  stop();
  started?.(fakeStream(log));
  await settle();
  expect(log).toEqual(["stopped"]);
});

test("stopping after the camera started stops it", async () => {
  const log: string[] = [];
  fakeCamera(async () => fakeStream(log));
  const stop = scanCamera(
    fakeVideo(),
    () => {},
    () => {},
  );
  await settle();
  expect(log).toEqual([]);
  stop();
  expect(log).toEqual(["stopped"]);
});

test("a refused camera says why", async () => {
  const errors: string[] = [];
  fakeCamera(async () => {
    throw new DOMException("denied", "NotAllowedError");
  });
  scanCamera(
    fakeVideo(),
    () => {},
    (text) => errors.push(text),
  );
  await settle();
  expect(errors).toEqual([
    "カメラが許可されていません。システム設定で、hush にカメラを許可してください。",
  ]);
});
