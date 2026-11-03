import { describeRoute } from "hono-openapi";

import { factory } from "@/lib/factory";
import { putFile, writeHeaders, writeRoute } from "@/lib/fileRoute";

import { params } from "./params";

export const put = factory.createHandlers(
  describeRoute(writeRoute("an image")),
  params,
  writeHeaders,
  (c) => putFile(c, { kind: "image", ...c.req.valid("param") }, "The image", c.req.valid("header")),
);
