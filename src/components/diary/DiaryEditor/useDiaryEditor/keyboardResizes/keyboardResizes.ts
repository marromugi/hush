/** How long after the keyboard's word, or after the resize before, a resize is still the keyboard's. */
const SETTLE_MS = 500;

/**
 * Tells the window resizes the on-screen keyboard causes from the ones made
 * by hand, and calls `onKeyboard` for each of them and for each word that the
 * keyboard moved. The resizes and the word can come in any order, and the
 * app can go on resizing the window after the word, as SwiftUI does while it
 * animates: a resize within 500 ms of the word or of the resize before it is
 * the keyboard's, so the last call comes at the size the window keeps.
 */
export function keyboardResizes(onKeyboard: () => void) {
  let moving = false;
  let settled: ReturnType<typeof setTimeout> | undefined;
  const keepListening = () => {
    moving = true;
    clearTimeout(settled);
    settled = setTimeout(() => (moving = false), SETTLE_MS);
  };
  return {
    keyboardMoved: () => {
      keepListening();
      onKeyboard();
    },
    windowResized: () => {
      if (!moving) return;
      keepListening();
      onKeyboard();
    },
  };
}
