import { validator } from "hono-openapi";

import { refuse } from "@/lib/fileRoute";
import { EntryParams } from "@/lib/schemas";

export const params = validator("param", EntryParams, refuse(400));
