import type { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import type { Env } from "@/lib/factory";

/** Describes every route of `app`. */
export function get(app: Hono<Env>) {
  return openAPIRouteHandler(app, {
    documentation: {
      info: { title: "Hush sync", version: "1" },
      components: {
        securitySchemes: {
          syncKey: { type: "http", scheme: "bearer", description: "The sync key." },
        },
      },
      security: [{ syncKey: [] }],
    },
    // A malformed condition is answered with 428, not the 400 this would add.
    defaultValidationErrorResponse: false,
  });
}
