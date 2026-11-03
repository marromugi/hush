import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // "@/" is src, as in tsconfig.json.
  resolve: { alias: { "@": "/src" } },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // The hash of "test-sync-key".
      miniflare: {
        bindings: {
          SYNC_KEY_HASH: "053cbf2d9ded388bf3a57919d2679938f2d9e3fb1721f96e209db0c8522b0fde",
        },
        // The tests write far more than 60 times a minute between them.
        // The limit itself is tested on the middleware alone.
        ratelimits: {
          WRITE_LIMIT: { namespace_id: "1001", simple: { limit: 100_000, period: 60 } },
        },
      },
    }),
  ],
});
