import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // The hash of "test-sync-key".
      miniflare: {
        bindings: {
          SYNC_KEY_HASH: "053cbf2d9ded388bf3a57919d2679938f2d9e3fb1721f96e209db0c8522b0fde",
        },
      },
    }),
  ],
});
