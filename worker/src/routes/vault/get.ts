import { describeRoute } from "hono-openapi";

import { factory } from "@/lib/factory";
import { getFile, readRoute } from "@/lib/fileRoute";

export const get = factory.createHandlers(describeRoute(readRoute("the vault")), (c) =>
  getFile(c, { kind: "vault" }, "The vault"),
);
