import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractRawText, extractResumeWithAi, getDocument, destroy } =
  vi.hoisted(() => ({
    extractRawText: vi.fn(),
    extractResumeWithAi: vi.fn((_text: string, baseline: unknown) => baseline),
    getDocument: vi.fn(),
    destroy: vi.fn(),
  }));

vi.mock("mammoth", () => ({ extractRawText }));
vi.mock("./resumeApi", () => ({ extractResumeWithAi }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  VerbosityLevel: { ERRORS: 0 },
  getDocument,
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "pdf.worker.mjs",
}));

import { importResumeFile } from "./resumeImport";

function resumeFile(name: string, size = 100): File {
  return {
    name,
    size,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  } as unknown as File;
}

describe("resume file import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractRawText.mockResolvedValue({
      value: "Jordan Lee\nSoftware Developer\njordan@example.com",
      messages: [],
    });
    getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [
              { str: "Lee", hasEOL: false, transform: [1, 0, 0, 1, 100, 700] },
              {
                str: "jordan@example.com",
                hasEOL: false,
                transform: [1, 0, 0, 1, 50, 660],
              },
              {
                str: "Jordan",
                hasEOL: false,
                transform: [1, 0, 0, 1, 50, 700],
              },
              {
                str: "Software Developer",
                hasEOL: false,
                transform: [1, 0, 0, 1, 50, 680],
              },
              {
                str: "Vancouver, BC",
                hasEOL: false,
                transform: [1, 0, 0, 1, 50, 640],
              },
            ],
          }),
        }),
      }),
      destroy,
    });
  });

  it("extracts and parses a Word DOCX locally", async () => {
    const result = await importResumeFile(resumeFile("resume.docx"));

    expect(extractRawText).toHaveBeenCalledWith({
      arrayBuffer: expect.any(ArrayBuffer),
    });
    expect(result).toMatchObject({
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan@example.com",
      sourceText: expect.stringContaining("Jordan Lee"),
    });
    expect(extractResumeWithAi).toHaveBeenCalledWith(
      expect.stringContaining("Jordan Lee"),
      expect.objectContaining({ firstName: "Jordan", lastName: "Lee" }),
    );
    expect(getDocument).not.toHaveBeenCalled();
  });

  it("extracts every PDF page and destroys the worker task", async () => {
    const result = await importResumeFile(resumeFile("resume.pdf"));

    expect(getDocument).toHaveBeenCalledWith({
      data: expect.any(Uint8Array),
      verbosity: 0,
    });
    expect(result).toMatchObject({
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan@example.com",
      location: "Vancouver, BC",
      sourceText: expect.stringContaining("Software Developer"),
    });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects unsupported and oversized files before extraction", async () => {
    await expect(importResumeFile(resumeFile("resume.doc"))).rejects.toThrow(
      "Word (.docx) or PDF",
    );
    await expect(
      importResumeFile(resumeFile("resume.pdf", 10 * 1024 * 1024 + 1)),
    ).rejects.toThrow("smaller than 10 MB");
    expect(extractRawText).not.toHaveBeenCalled();
    expect(getDocument).not.toHaveBeenCalled();
  });
});
