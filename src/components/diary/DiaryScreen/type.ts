export type DiaryScreenProps = {
  /** Called after what was written has been saved. */
  onLock: () => Promise<void>;
};
