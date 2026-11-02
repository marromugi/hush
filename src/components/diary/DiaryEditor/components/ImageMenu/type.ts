import type { ImageAlign } from "@/lib/diary/imageAlign";

export type ImageMenuProps = {
  /** Where the selected image sits now. */
  align: ImageAlign;
  onAlign: (align: ImageAlign) => void;
};
