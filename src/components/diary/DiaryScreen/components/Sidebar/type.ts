export type SidebarProps = {
  /** Days to list, as `YYYY-MM-DD`, oldest first and each once. */
  dates: string[];
  selected: string;
  onSelect: (date: string) => void;
  /** Why the days could not all be listed. */
  error: string | null;
};
