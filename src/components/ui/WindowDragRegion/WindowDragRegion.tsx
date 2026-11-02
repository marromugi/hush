/**
 * The strip along the top of the window that moves the window when dragged.
 * The title bar lies over the page, so the page has to provide it.
 */
export function WindowDragRegion() {
  return <div data-tauri-drag-region aria-hidden className="fixed inset-x-0 top-0 z-10 h-7" />;
}
