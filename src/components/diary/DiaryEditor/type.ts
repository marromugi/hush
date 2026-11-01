export type DiaryEditorProps = {
  /** Read once, when the editor is created. */
  initialBody: string;
  /** Called with the body as HTML after every change. */
  onChange: (body: string) => void;
};
