import { afterEach, describe, expect, it, vi } from "vitest";

import { scanActivePage } from "./browser";

describe("extension browser bridge", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("scans when Chrome omits the active tab URL", async () => {
    const executeScript = vi.fn().mockResolvedValue([]);
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage: vi.fn().mockResolvedValue({
          ok: true,
          fields: [
            {
              id: "email",
              label: "Email address",
              kind: "email",
              required: true,
              value: "",
              options: [],
            },
          ],
        }),
      },
      scripting: { executeScript },
    });

    await expect(scanActivePage()).resolves.toMatchObject([
      { id: "email", label: "Email address" },
    ]);
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 42 },
      files: ["content.js"],
    });
  });

  it("reports a useful error when Chrome blocks script injection", async () => {
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi
          .fn()
          .mockResolvedValue([{ id: 42, url: "chrome://extensions" }]),
      },
      scripting: {
        executeScript: vi
          .fn()
          .mockRejectedValue(new Error("Cannot access contents")),
      },
    });

    await expect(scanActivePage()).rejects.toThrow(
      "ApplyProof could not access this tab",
    );
  });
});
