import type { ReactNode } from "react";

export type ImageFrameProps = {
  /** In percent of the entry's width; `null` for the image's own size. */
  width: number | null;
  /** Given only while the image can be resized; called with the new width once dragging ends. */
  onResize?: (width: number) => void;
  /** The image, or what stands in for it while it is read. */
  children: ReactNode;
};
