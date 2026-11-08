export type PictureButtonProps = {
  /** Called with the pictures chosen, in their order; not called when none are. */
  onPick: (files: File[]) => void;
  disabled: boolean;
};
