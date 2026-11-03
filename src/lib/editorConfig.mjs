import { workspaceAccountRegistry } from './centralAccountOrigins.mjs';

export const editorEnabled = import.meta.env.PUBLIC_EDITOR_ENABLED === "true";
export const localEditor =
  import.meta.env.DEV && import.meta.env.PUBLIC_EDITOR_LOCAL === "true";
export const editorApiBase = workspaceAccountRegistry()?.api ?? (localEditor
  ? ""
  : (
      import.meta.env.PUBLIC_EDITOR_API_BASE || "https://api.kamitsubaki.wiki"
    ).replace(/\/$/, ""));
