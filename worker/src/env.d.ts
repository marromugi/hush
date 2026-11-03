import type * as main from "./index";

declare global {
  namespace Cloudflare {
    interface Env {
      FILES: R2Bucket;
      SYNC_KEY_HASH: string;
    }
    interface GlobalProps {
      mainModule: typeof main;
    }
  }
}
