import type { Ref } from "react";

export type PictureInputProps = {
  ref: Ref<HTMLInputElement>;
  /** Called with the pictures chosen, in their order; not called when none are. */
  onPick: (files: File[]) => void;
};
