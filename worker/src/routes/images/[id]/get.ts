import { describeRoute } from "hono-openapi";

import { factory } from "@/lib/factory";
import { getFile, readRoute } from "@/lib/fileRoute";

import { params } from "./params";

export const get = factory.createHandlers(describeRoute(readRoute("an image")), params, (c) =>
  getFile(c, { kind: "image", ...c.req.valid("param") }, "The image"),
);
