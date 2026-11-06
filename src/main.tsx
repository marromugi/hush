import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ToastRegion } from "@/components/ui/ToastRegion";
import { EntryHostContext } from "@/hooks/diary/useEntryHost";
import { tauriEntryHost } from "@/lib/diary/tauriEntryHost";

import { App } from "./App";

import "./styles.css";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("#root is missing from index.html");
}

createRoot(root).render(
  <StrictMode>
    <EntryHostContext value={tauriEntryHost}>
      <App />
    </EntryHostContext>
    <ToastRegion />
  </StrictMode>,
);
