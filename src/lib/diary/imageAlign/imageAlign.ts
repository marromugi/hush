/** Where an image sits across the entry's width. `left` is how an image sits when nothing is said. */
export type ImageAlign = "left" | "center" | "right";

/** The alignment written in an entry's HTML; `left` when nothing, or nothing known, is written. */
export function parseAlign(text: string | null): ImageAlign {
  return text === "center" || text === "right" ? text : "left";
}
