import { quickMoveTiming } from "@/lib/ui/quickMove";
import { reducesMotion } from "@/lib/ui/reducesMotion";

/** How long a menu keeps sliding after it was told to: the move plus a little. */
const SLIDE_WINDOW_MS = quickMoveTiming.duration + 40;

const slideEnds = new WeakMap<HTMLElement, number>();

/**
 * Fades `menu` in while it rises 4px into place. Started as the menu is put
 * on the page, before it is drawn, so it is never seen at full strength first.
 */
export function riseIn(menu: HTMLElement): void {
  if (reducesMotion()) return;
  menu.animate(
    [
      { opacity: 0, translate: "0 4px" },
      { opacity: 1, translate: "0 0" },
    ],
    quickMoveTiming,
  );
}

/**
 * Lets `menu` slide to the next place it is moved to, instead of jumping
 * there. Its `data-slide` attribute turns the slide on; it is taken off a
 * moment after the menu is moved (`settle`), so later moves jump again.
 */
export function slideNextMove(menu: HTMLElement): void {
  menu.dataset.slide = "";
}

/** Takes the slide off `menu` once its current move has had time to finish. */
export function settle(menu: HTMLElement): void {
  if (menu.dataset.slide === undefined) return;
  window.clearTimeout(slideEnds.get(menu));
  slideEnds.set(
    menu,
    window.setTimeout(() => {
      delete menu.dataset.slide;
    }, SLIDE_WINDOW_MS),
  );
}

/** Makes `menu` jump to wherever it goes next, as when it appears. */
export function stopSliding(menu: HTMLElement): void {
  window.clearTimeout(slideEnds.get(menu));
  delete menu.dataset.slide;
}
