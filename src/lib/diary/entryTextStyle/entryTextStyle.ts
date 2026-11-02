import type { CSSProperties } from "react";

import type { TextSettings } from "../../settings/settings";

/** Full-width characters to a line of the entry. */
const LINE_CHARACTERS = 36;

export type EntryTextStyle = CSSProperties & {
  "--entry-size": string;
  "--entry-line": string;
  "--entry-tracking": string;
  "--entry-width": string;
};

/**
 * The text settings as the CSS variables `entryProse` reads, and the width
 * that fits 36 full-width characters with their letter spacing. Put it on an
 * element around the entry; the entry inherits them.
 */
export function entryTextStyle(text: TextSettings): EntryTextStyle {
  return {
    "--entry-size": `${text.size}px`,
    "--entry-line": String(text.lineHeight),
    "--entry-tracking": `${text.letterSpacing}em`,
    "--entry-width": `${Number((LINE_CHARACTERS * (1 + text.letterSpacing)).toFixed(2))}em`,
  };
}
