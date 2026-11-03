import { describeRoute } from "hono-openapi";

import { factory } from "@/lib/factory";
import { putFile, writeHeaders, writeRoute } from "@/lib/fileRoute";

export const put = factory.createHandlers(
  describeRoute(writeRoute("the vault")),
  writeHeaders,
  (c) => putFile(c, { kind: "vault" }, "The vault", c.req.valid("header")),
);
