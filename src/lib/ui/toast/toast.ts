import { toast } from "react-hot-toast";

/**
 * Tells the person that something went wrong, for a while at the edge of the
 * screen, and has screen readers say it at once. The same text again replaces
 * the one showing instead of stacking.
 */
export function toastError(text: string): void {
  toast.error(text, { id: text, ariaProps: { role: "alert", "aria-live": "assertive" } });
}

/** Tells the person something they should know, in the same place as errors. */
export function toastNotice(text: string): void {
  toast(text, { id: text });
}
