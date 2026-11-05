export type EntryLinkCardProps = {
  /** Where the card's link points. */
  url: string;
  /** The page's title; `null` shows the link itself. */
  title: string | null;
  /** The id the page's picture is saved as; `null` when it has none. */
  image: string | null;
  /** True while the page is being read. */
  loading?: boolean;
  /** True while the card is the editor's selection. */
  selected?: boolean;
};
