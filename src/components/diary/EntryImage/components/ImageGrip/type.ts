import type { ReactNode } from "react";

export type ImageGripProps = {
  /** In percent of the entry's width; `null` for the image's own size. */
  width: number | null;
  /** Called with the new width once dragging ends. */
  onResize: (width: number) => void;
  /** The image. */
  children: ReactNode;
};
