import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ToastRegion } from "@/components/ui/ToastRegion";
import { installEditorChannel } from "@/lib/diary/editorChannel";

import { EditorPage } from "./EditorPage";

import "./styles.css";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("#root is missing from editor.html");
}

installEditorChannel();

createRoot(root).render(
  <StrictMode>
    <EditorPage />
    <ToastRegion />
  </StrictMode>,
);
