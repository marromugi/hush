import type { Option } from "./lib/matchOptions";

export type ComboboxProps = {
  label: string;
  options: readonly Option[];
  /** The chosen option's value; `null` for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Shown in the list when nothing matches. */
  empty?: string;
  disabled?: boolean;
};
