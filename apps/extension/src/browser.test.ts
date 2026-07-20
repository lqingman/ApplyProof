import { afterEach, describe, expect, it, vi } from "vitest";

import {
  attachResumeToActivePage,
  enableInlineAssistants,
  fillActivePage,
  scanActivePage,
} from "./browser";

describe("extension browser bridge", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("scans when Chrome omits the active tab URL", async () => {
    const executeScript = vi.fn().mockResolvedValue([]);
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("No listener"))
      .mockResolvedValueOnce({
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
      });
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage,
      },
      scripting: { executeScript },
    });

    await expect(scanActivePage()).resolves.toMatchObject({
      blockedCount: 0,
      fields: [{ id: "email", label: "Email address" }],
    });
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
        sendMessage: vi.fn().mockRejectedValue(new Error("No listener")),
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

  it("returns normalized safe-fill results", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("No listener"))
      .mockResolvedValueOnce({
        ok: true,
        results: [{ fieldId: "email", status: "filled" }],
      });
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage,
      },
      scripting: { executeScript: vi.fn().mockResolvedValue([]) },
    });

    await expect(
      fillActivePage([{ fieldId: "email", value: "maya.chen@example.com" }]),
    ).resolves.toEqual([{ fieldId: "email", status: "filled" }]);
  });

  it("reuses an installed listener without reinjecting the bundle", async () => {
    const executeScript = vi.fn();
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, fields: [], blockedCount: 0 });
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage,
      },
      scripting: { executeScript },
    });

    await expect(scanActivePage()).resolves.toEqual({
      fields: [],
      blockedCount: 0,
    });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it("enables writing assistants for scanned fields", async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, mountedCount: 1 });
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage,
      },
      scripting: { executeScript: vi.fn() },
    });
    const fields = [
      {
        id: "project",
        label: "Describe a project",
        kind: "textarea" as const,
        required: true,
        value: "",
        options: [],
      },
    ];

    const job = {
      company: "Example Labs",
      role: "Frontend Engineer",
      description: "Build accessible products.",
    };
    await expect(enableInlineAssistants(fields, job)).resolves.toBe(1);
    expect(sendMessage).toHaveBeenLastCalledWith(
      42,
      expect.objectContaining({
        type: "APPLYPROOF_ENABLE_INLINE_ASSISTANTS",
        fields,
        job,
        generateBlankFields: true,
      }),
    );
  });

  it("sends the saved resume to the active page after a user action", async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ status: "attached" });
    vi.stubGlobal("chrome", {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42 }]),
        sendMessage,
      },
      scripting: { executeScript: vi.fn() },
    });
    const file = {
      name: "maya.pdf",
      type: "application/pdf",
      lastModified: 123,
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    } as unknown as File;

    await expect(attachResumeToActivePage(file)).resolves.toBe("attached");
    expect(sendMessage).toHaveBeenLastCalledWith(42, {
      type: "APPLYPROOF_ATTACH_RESUME",
      file: {
        name: "maya.pdf",
        type: "application/pdf",
        lastModified: 123,
        data: "AQID",
      },
    });
  });
});
