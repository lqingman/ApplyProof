import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

import manifest from "../public/manifest.json";

describe("least-privilege manifest", () => {
  it("uses active-tab injection without persistent online-site access", () => {
    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).toContain("scripting");
    expect(manifest.host_permissions).toEqual([
      "http://localhost/*",
      "http://127.0.0.1/*",
    ]);
    expect(manifest).not.toHaveProperty("content_scripts");
    expect(JSON.stringify(manifest)).not.toContain("<all_urls>");
  });

  it("opens the side panel from an action event that grants activeTab", async () => {
    const source = readFileSync(
      resolve(process.cwd(), "public/background.js"),
      "utf8",
    );
    const setPanelBehavior = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockResolvedValue(undefined);
    let actionListener: ((tab: { id?: number }) => void) | undefined;

    runInNewContext(source, {
      chrome: {
        action: {
          onClicked: {
            addListener: (listener: (tab: { id?: number }) => void) => {
              actionListener = listener;
            },
          },
        },
        sidePanel: { open, setPanelBehavior },
      },
      console,
    });

    expect(setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: false,
    });
    expect(actionListener).toBeTypeOf("function");
    actionListener?.({ id: 42 });
    expect(open).toHaveBeenCalledWith({ tabId: 42 });
  });
});
