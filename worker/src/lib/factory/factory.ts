import { createFactory } from "hono/factory";

export type Env = { Bindings: Cloudflare.Env };

/** Makes handlers and middleware that know the Worker's bindings. */
export const factory = createFactory<Env>();
