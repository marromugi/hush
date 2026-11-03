import { describeRoute, resolver } from "hono-openapi";

import { listFiles } from "@/lib/bucket";
import { factory } from "@/lib/factory";
import { FileList } from "@/lib/schemas";

export const get = factory.createHandlers(
  describeRoute({
    summary: "Lists every file with its newest version.",
    responses: {
      200: {
        description: "The files.",
        content: { "application/json": { schema: resolver(FileList) } },
      },
    },
  }),
  async (c) => c.json(await listFiles(c.env.FILES)),
);
