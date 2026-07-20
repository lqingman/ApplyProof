import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteSavedResumeFile,
  loadSavedResumeFile,
  loadSavedResumeMetadata,
  loadSavedResumeText,
  saveResumeFile,
} from "./resumeFileStorage";

describe("local original resume storage", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  it("persists and reconstructs the original resume file", async () => {
    const file = new File(["resume contents"], "maya-resume.pdf", {
      type: "application/pdf",
      lastModified: 1_725_000_000_000,
    });

    const saved = await saveResumeFile(file);

    expect(saved).toMatchObject({
      name: "maya-resume.pdf",
      type: "application/pdf",
      size: file.size,
      lastModified: file.lastModified,
    });
    await expect(loadSavedResumeMetadata()).resolves.toEqual(saved);
    const restored = await loadSavedResumeFile();
    expect(restored).toMatchObject({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    });
    const contents = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(restored as File);
    });
    expect(contents).toBe("resume contents");
  });

  it("replaces and deletes the saved file without profile storage", async () => {
    await saveResumeFile(
      new File(["old"], "old.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    await saveResumeFile(
      new File(["new"], "new.pdf", { type: "application/pdf" }),
    );

    await expect(loadSavedResumeMetadata()).resolves.toMatchObject({
      name: "new.pdf",
    });
    await deleteSavedResumeFile();
    await expect(loadSavedResumeMetadata()).resolves.toBeNull();
  });

  it("stores extracted text locally for grounded answers", async () => {
    const file = new File(["binary"], "projects.pdf", {
      type: "application/pdf",
    });
    await saveResumeFile(
      file,
      "PROJECTS\nBuilt an accessibility dashboard in React.",
    );

    await expect(loadSavedResumeText()).resolves.toBe(
      "PROJECTS\nBuilt an accessibility dashboard in React.",
    );
    await expect(loadSavedResumeMetadata()).resolves.toMatchObject({
      textAvailable: true,
    });

    await saveResumeFile(new File(["new"], "replacement.pdf"));
    await expect(loadSavedResumeText()).resolves.toBeNull();
  });

  it("rejects unsupported and oversized files", async () => {
    await expect(
      saveResumeFile(new File(["legacy"], "resume.doc")),
    ).rejects.toThrow("Word (.docx) or PDF");
    const oversized = {
      name: "large.pdf",
      size: 10 * 1024 * 1024 + 1,
    } as File;
    await expect(saveResumeFile(oversized)).rejects.toThrow(
      "smaller than 10 MB",
    );
  });
});
