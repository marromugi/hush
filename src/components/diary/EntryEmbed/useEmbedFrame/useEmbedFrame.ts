import { useEffect, useRef, useState } from "react";

import { usePromise } from "@/hooks/common/usePromise";
import { embedFrameSrc } from "@/lib/diary/embedLink";
import type { EmbedLink } from "@/lib/diary/embedLink";
import { embedPagesOrigin } from "@/lib/vault/commands";

import { tweetMessage } from "./tweetMessage";
import { useColorScheme } from "./useColorScheme";

const X_ORIGIN = "https://platform.twitter.com";

/**
 * The frame that shows `embed`: its address, in the system's light or dark
 * mode, and the height it needs. A YouTube video waits, with no address,
 * until where its page is served is known; if that cannot be known, it is
 * shown from YouTube as it is. It keeps the shape of a video, so its height
 * is `null`. A post on X tells its height once shown; until then the height
 * is `null` too.
 */
export function useEmbedFrame(embed: EmbedLink) {
  const theme = useColorScheme();
  const pages = usePromise(embedPagesOrigin);
  const src =
    embed.site === "youtube" && pages.status === "loading"
      ? null
      : embedFrameSrc(embed, theme, pages.status === "done" ? pages.value : null);
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<{ src: string | null; px: number } | null>(null);

  // X's embed page talks with the page around it in messages, and shows the post only once answered.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const frame = ref.current?.contentWindow;
      if (!frame || event.source !== frame || event.origin !== X_ORIGIN) return;
      const read = tweetMessage(event.data);
      if (!read) return;
      if (read.reply) frame.postMessage(read.reply, X_ORIGIN);
      const px = read.height;
      if (px !== null) setHeight({ src, px });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [src]);

  // A height told for another address, as before the theme changed, belongs to a page no longer shown.
  return { ref, src, height: height?.src === src ? height.px : null };
}
