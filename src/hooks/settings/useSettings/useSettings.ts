import { useSyncExternalStore } from "react";

import { readSettings, subscribeSettings } from "../../../lib/settings/settings";
import type { Settings } from "../../../lib/settings/settings";

/** This device's settings, kept up to date as they change. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, readSettings);
}
