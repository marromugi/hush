import { usePromise } from "@/hooks/common/usePromise";
import { useEntryHost } from "@/hooks/diary/useEntryHost";
import { toastError } from "@/lib/ui/toast";
import { failureText } from "@/lib/vault/errorText";

import { pictureDataUrl } from "./pictureDataUrl";

export type UseImageSrc = {
  loading: boolean;
  /** What an `<img>` shows the picture from, once read. */
  src: string | null;
  /** True once reading failed; why is told in a toast. */
  failed: boolean;
};

/** The image saved as `id`, read and decrypted once per id by the app the entry is in. */
export function useImageSrc(id: string): UseImageSrc {
  const host = useEntryHost();
  const read = usePromise(
    () => host.readImage(id).then(pictureDataUrl),
    id,
    (failure) => toastError(`画像を読み込めませんでした。${failureText(failure)}`),
  );
  return {
    loading: read.status === "loading",
    src: read.status === "done" ? read.value : null,
    failed: read.status === "failed",
  };
}
