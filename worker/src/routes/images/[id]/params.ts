import { validator } from "hono-openapi";

import { refuse } from "@/lib/fileRoute";
import { ImageParams } from "@/lib/schemas";

export const params = validator("param", ImageParams, refuse(400));
