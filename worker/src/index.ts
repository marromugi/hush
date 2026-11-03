import { Hono } from "hono";

import type { Env } from "@/lib/factory";
import { limitWrites } from "@/middleware/limitWrites";
import { requireSyncKey } from "@/middleware/requireSyncKey";
import { get as getEntry } from "@/routes/entries/[date]/get";
import { put as putEntry } from "@/routes/entries/[date]/put";
import { get as getFiles } from "@/routes/files/get";
import { get as getImage } from "@/routes/images/[id]/get";
import { put as putImage } from "@/routes/images/[id]/put";
import { get as getOpenApi } from "@/routes/openapi.json/get";
import { get as getVault } from "@/routes/vault/get";
import { put as putVault } from "@/routes/vault/put";

/**
 * Stores a vault's encrypted files for the app's devices. The files are
 * encrypted on the device; this only checks the sync key and refuses a
 * write made against a version that is no longer the newest. Each route
 * lives under `routes/` at its own path, one file per method.
 */
const app = new Hono<Env>();

app.use("*", requireSyncKey);
// After the key check, so requests without the key cannot use up the owner's writes.
app.on("PUT", "*", limitWrites);
app.onError((error, c) => c.json({ error: error.message }, 500));

app.get("/files", ...getFiles);
app.get("/vault", ...getVault);
app.put("/vault", ...putVault);
app.get("/entries/:date", ...getEntry);
app.put("/entries/:date", ...putEntry);
app.get("/images/:id", ...getImage);
app.put("/images/:id", ...putImage);
app.get("/openapi.json", getOpenApi(app));

export default app;
