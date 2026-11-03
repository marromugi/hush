import type * as main from "./index";

declare global {
  namespace Cloudflare {
    interface Env {
      FILES: R2Bucket;
      /** Unset until `wrangler secret put SYNC_KEY_HASH` has run. */
      SYNC_KEY_HASH?: string;
    }
    interface GlobalProps {
      mainModule: typeof main;
    }
  }
}
