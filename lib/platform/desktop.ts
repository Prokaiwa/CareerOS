// The ONLY web-side platform code (DESKTOP_ARCHITECTURE.md §2, ADR-022).
// Client components import this to detect the desktop shell and use the
// few native capabilities it grants. Engines and server code never import
// this module — platform capabilities reach them as plain data (a picked
// folder path travels through the normal HTTP routes).

type TauriDialog = {
  open(options: {
    directory?: boolean;
    multiple?: boolean;
    title?: string;
  }): Promise<string | string[] | null>;
};

type TauriGlobal = { dialog: TauriDialog };

/**
 * True when running inside the Tauri desktop shell. Detection uses the
 * shell's injected global — never user-agent sniffing.
 */
export function isDesktopShell(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Native folder picker (desktop shell only — the capability grants exactly
 * this one dialog call). Returns the chosen absolute path, or null if the
 * user cancelled or the shell isn't present.
 */
export async function pickFolder(title: string): Promise<string | null> {
  if (!isDesktopShell()) return null;
  const tauri = (window as unknown as { __TAURI__: TauriGlobal }).__TAURI__;
  const result = await tauri.dialog.open({ directory: true, multiple: false, title });
  return typeof result === "string" ? result : null;
}
