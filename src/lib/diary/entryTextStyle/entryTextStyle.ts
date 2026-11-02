import type { CSSProperties } from "react";

import type { TextSettings } from "../../settings/settings";

export type EntryTextStyle = CSSProperties & {
  "--entry-size": string;
  "--entry-line": string;
  "--entry-tracking": string;
};

/**
 * The text settings as the CSS variables `entryProse` reads. Put it on an
 * element around the entry; the entry inherits them.
 */
export function entryTextStyle(text: TextSettings): EntryTextStyle {
  return {
    "--entry-size": `${text.size}px`,
    "--entry-line": String(text.lineHeight),
    "--entry-tracking": `${text.letterSpacing}em`,
  };
}
