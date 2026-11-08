import type { Ref } from "react";

export type DiaryEditorProps = {
  /** Read once, when the editor is created. */
  initialBody: string;
  /** Called with the body as HTML after every change. */
  onChange: (body: string) => void;
  /** True while nothing can be typed. */
  disabled: boolean;
  /**
   * Room in pixels at the top and bottom of the window that the cursor must
   * stay out of, as when bars stick over the page there.
   */
  keepClear?: KeepClear;
  /** The CSS `font-family` to show the entry in; the page's font when left out. */
  fontFamily?: string;
  /** True while that font loads; the text is blurred until then. */
  fontLoading?: boolean;
  /** Lets the screen around the editor put pictures in it, as from a button of its own. */
  ref?: Ref<DiaryEditorHandle>;
};

/** What the screen around the editor can do with it. */
export type DiaryEditorHandle = {
  /**
   * Saves each of `files` as an image and puts it where the cursor is, as a
   * pasted picture is; after what is written when the entry has not had
   * focus yet. One that cannot be read or saved is told in a toast.
   */
  addImages: (files: File[]) => void;
};

export type KeepClear = { top: number; bottom: number };
