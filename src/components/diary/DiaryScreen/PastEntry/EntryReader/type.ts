export type EntryReaderProps = {
  /** Read once, when the reader is created. */
  body: string;
  /** The CSS `font-family` to show it in; the page's font when left out. */
  fontFamily?: string;
  /** True while that font loads; the text is blurred until then. */
  fontLoading?: boolean;
};
