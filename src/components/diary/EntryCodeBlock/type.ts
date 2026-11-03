import type { ReactNode } from "react";

export type EntryCodeBlockProps = {
  /** Shiki's id for the code's language; `null` for plain text. */
  language: string | null;
  /** Given only where the code can be changed; called with the picked language. */
  onLanguageChange?: (language: string | null) => void;
  /** The code itself, in its `<pre>`. */
  children: ReactNode;
};
