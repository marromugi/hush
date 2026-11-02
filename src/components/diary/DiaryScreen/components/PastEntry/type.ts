export type PastEntryProps = {
  /** `YYYY-MM-DD`. Give the component a `key` of the same date. */
  date: string;
  /** The CSS `font-family` for an entry saved without a font; the page's font when left out. */
  defaultFontFamily?: string;
};
