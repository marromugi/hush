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
};

export type KeepClear = { top: number; bottom: number };
