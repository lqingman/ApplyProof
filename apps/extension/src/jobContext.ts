import type { PageJobContext } from "@applyproof/shared-types";

function cleanText(value: string | null | undefined, maxLength: number) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function textFromHtml(document: Document, value: string) {
  const container = document.createElement("div");
  container.innerHTML = value;
  container
    .querySelectorAll("script, style, button, input, textarea, select")
    .forEach((node) => node.remove());
  return cleanText(container.textContent, 12000);
}

type JobPosting = {
  "@type"?: string | string[];
  title?: unknown;
  description?: unknown;
  hiringOrganization?: { name?: unknown };
};

function jobPostingFrom(document: Document) {
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  )) {
    try {
      const parsed: unknown = JSON.parse(script.textContent ?? "null");
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "@graph" in parsed
          ? ((parsed as { "@graph"?: unknown[] })["@graph"] ?? [])
          : [parsed];
      const posting = candidates.find((candidate): candidate is JobPosting => {
        if (!candidate || typeof candidate !== "object") return false;
        const type = (candidate as JobPosting)["@type"];
        return Array.isArray(type)
          ? type.includes("JobPosting")
          : type === "JobPosting";
      });
      if (posting) return posting;
    } catch {
      // Invalid page-owned structured data is ignored.
    }
  }
  return undefined;
}

function firstText(document: Document, selectors: string[], maxLength: number) {
  for (const selector of selectors) {
    const text = cleanText(
      document.querySelector(selector)?.textContent,
      maxLength,
    );
    if (text) return text;
  }
  return undefined;
}

export function extractJobContext(
  document: Document,
): PageJobContext | undefined {
  const posting = jobPostingFrom(document);
  const structuredDescription =
    typeof posting?.description === "string"
      ? textFromHtml(document, posting.description)
      : undefined;
  const company =
    (typeof posting?.hiringOrganization?.name === "string"
      ? cleanText(posting.hiringOrganization.name, 200)
      : undefined) ??
    firstText(
      document,
      [
        '[data-ui="company-name"]',
        '[data-testid="company-name"]',
        '[class*="company-name"]',
        "header img[alt]",
      ],
      200,
    ) ??
    cleanText(
      document.querySelector("header img[alt]")?.getAttribute("alt"),
      200,
    );
  const role =
    (typeof posting?.title === "string"
      ? cleanText(posting.title, 200)
      : undefined) ??
    firstText(
      document,
      [
        '[data-ui="job-title"]',
        '[data-testid="job-title"]',
        '[class*="job-title"]',
        "main h1",
        "h1",
      ],
      200,
    );
  const description =
    structuredDescription ??
    firstText(
      document,
      [
        '[data-ui="job-description"]',
        '[data-testid="job-description"]',
        '[id*="job-description"]',
        '[class*="job-description"]',
      ],
      12000,
    );
  if (!company && !role && !description) return undefined;
  return {
    ...(company ? { company } : {}),
    ...(role ? { role } : {}),
    ...(description ? { description } : {}),
  };
}
