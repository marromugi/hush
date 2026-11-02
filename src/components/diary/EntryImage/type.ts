export type EntryImageProps = {
  /** The id the image was saved under. */
  id: string;
  /** True while the image is the editor's selection. */
  selected?: boolean;
  /** In percent of the entry's width; `null` shows the image at its own size, up to that width. */
  width?: number | null;
  /** Given only where the image can be resized; called with the new width once dragging ends. */
  onResize?: (width: number) => void;
};
