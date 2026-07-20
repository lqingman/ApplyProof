import { parseResumeText, type ParsedResume } from "./resumeTextParser";
import { extractResumeWithAi } from "./resumeApi";

export type ImportedResume = ParsedResume & { sourceText?: string };

const maxResumeBytes = 10 * 1024 * 1024;

async function textFromDocx(file: File) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return result.value;
}

async function textFromPdf(file: File) {
  const [
    { getDocument, GlobalWorkerOptions, VerbosityLevel },
    { default: pdfWorkerUrl },
  ] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    // Some otherwise readable PDFs contain unsupported TrueType hinting
    // instructions. PDF.js can still extract their text, so keep those
    // internal font warnings out of the extension error console while
    // preserving rejected loading tasks as real import errors.
    verbosity: VerbosityLevel.ERRORS,
  });
  const document = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const positioned = content.items
        .filter(
          (item): item is typeof item & { str: string; transform: number[] } =>
            "str" in item &&
            "transform" in item &&
            Array.isArray(item.transform),
        )
        .map((item) => ({
          text: item.str.trim(),
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
        }))
        .filter((item) => item.text);
      const rows: Array<{ y: number; items: typeof positioned }> = [];
      positioned.forEach((item) => {
        const row = rows.find(
          (candidate) => Math.abs(candidate.y - item.y) < 2,
        );
        if (row) row.items.push(item);
        else rows.push({ y: item.y, items: [item] });
      });
      pages.push(
        rows
          .sort((left, right) => right.y - left.y)
          .map((row) =>
            row.items
              .sort((left, right) => left.x - right.x)
              .map((item) => item.text)
              .join(" "),
          )
          .join("\n"),
      );
    }
    return pages.join("\n");
  } finally {
    await loadingTask.destroy();
  }
}

export async function importResumeFile(file: File): Promise<ImportedResume> {
  if (file.size > maxResumeBytes) {
    throw new Error("Choose a resume smaller than 10 MB.");
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text: string;
  if (extension === "docx") {
    text = await textFromDocx(file);
  } else if (extension === "pdf") {
    text = await textFromPdf(file);
  } else {
    throw new Error("Choose a Word (.docx) or PDF (.pdf) resume.");
  }
  const extracted = await extractResumeWithAi(text, parseResumeText(text));
  return { ...extracted, sourceText: text };
}
