import { describeRoute } from "hono-openapi";

import { factory } from "@/lib/factory";
import { putFile, writeHeaders, writeRoute } from "@/lib/fileRoute";

import { params } from "./params";

export const put = factory.createHandlers(
  describeRoute(writeRoute("an entry")),
  params,
  writeHeaders,
  (c) => putFile(c, { kind: "entry", ...c.req.valid("param") }, "The entry", c.req.valid("header")),
);
