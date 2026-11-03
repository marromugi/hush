import { usePromise } from "@/hooks/common/usePromise";
import { toastError } from "@/lib/ui/toast";
import { readImage } from "@/lib/vault/commands";
import { failureText } from "@/lib/vault/errorText";

import { pictureDataUrl } from "./lib/pictureDataUrl";

export type UseImageSrc = {
  loading: boolean;
  /** What an `<img>` shows the picture from, once read. */
  src: string | null;
  /** True once reading failed; why is told in a toast. */
  failed: boolean;
};

/** The image saved as `id`, read and decrypted once per id. */
export function useImageSrc(id: string): UseImageSrc {
  const read = usePromise(
    () => readImage(id).then(pictureDataUrl),
    id,
    (failure) => toastError(`画像を読み込めませんでした。${failureText(failure)}`),
  );
  return {
    loading: read.status === "loading",
    src: read.status === "done" ? read.value : null,
    failed: read.status === "failed",
  };
}
