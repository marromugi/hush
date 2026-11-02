import { fireEvent, render } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { ImageFrame } from "./ImageFrame";

/**
 * An image at 60% of a 600px column whose box runs from x=100 to x=460, and
 * its grip. The page has no layout here, so the sizes are given by hand.
 */
function framed(onResize: (width: number) => void) {
  const { container } = render(
    <div>
      <ImageFrame width={60} onResize={onResize}>
        <img alt="" />
      </ImageFrame>
    </div>,
  );
  const column = container.firstElementChild;
  const frame = column?.firstElementChild;
  const grip = frame?.querySelector("[aria-hidden]");
  if (
    !(column instanceof HTMLElement && frame instanceof HTMLElement && grip instanceof HTMLElement)
  ) {
    throw new Error("the frame did not render");
  }
  Object.defineProperty(column, "clientWidth", { value: 600 });
  frame.getBoundingClientRect = () => DOMRect.fromRect({ x: 100, width: 360, height: 200 });
  grip.setPointerCapture = () => {};
  return grip;
}

test("dragging the grip hands over the width where it is let go, measured from where it was caught", () => {
  const onResize = vi.fn<(width: number) => void>();
  const grip = framed(onResize);
  fireEvent.pointerDown(grip, { button: 0, clientX: 462, pointerId: 1 });
  fireEvent.pointerMove(grip, { clientX: 362, pointerId: 1 });
  fireEvent.pointerUp(grip, { clientX: 362, pointerId: 1 });
  expect(onResize.mock.calls).toEqual([[43]]);
});

test("a click on the grip without moving changes nothing", () => {
  const onResize = vi.fn<(width: number) => void>();
  const grip = framed(onResize);
  fireEvent.pointerDown(grip, { button: 0, clientX: 462, pointerId: 1 });
  fireEvent.pointerUp(grip, { clientX: 462, pointerId: 1 });
  expect(onResize).not.toHaveBeenCalled();
});

test("only the main button drags", () => {
  const onResize = vi.fn<(width: number) => void>();
  const grip = framed(onResize);
  fireEvent.pointerDown(grip, { button: 2, clientX: 462, pointerId: 1 });
  fireEvent.pointerMove(grip, { clientX: 362, pointerId: 1 });
  fireEvent.pointerUp(grip, { clientX: 362, pointerId: 1 });
  expect(onResize).not.toHaveBeenCalled();
});

test("a drag the system cancels changes nothing, and moving afterwards does not resize", () => {
  const onResize = vi.fn<(width: number) => void>();
  const grip = framed(onResize);
  fireEvent.pointerDown(grip, { button: 0, clientX: 462, pointerId: 1 });
  fireEvent.pointerMove(grip, { clientX: 362, pointerId: 1 });
  fireEvent.pointerCancel(grip, { pointerId: 1 });
  fireEvent.pointerMove(grip, { clientX: 300, pointerId: 1 });
  fireEvent.pointerUp(grip, { clientX: 300, pointerId: 1 });
  expect(onResize).not.toHaveBeenCalled();
});
