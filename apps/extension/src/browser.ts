import {
  pageFillResultSchema,
  pageScanSchema,
  type FieldFill,
  type FillResult,
  type PageScan,
  type NormalizedField,
  type PageJobContext,
} from "@applyproof/shared-types";

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("Open a job application tab and try again.");
  return tab.id;
}

async function ensureScanner(tabId: number) {
  try {
    const response: unknown = await chrome.tabs.sendMessage(tabId, {
      type: "APPLYPROOF_PING",
    });
    if ((response as { ok?: boolean })?.ok) return;
  } catch {
    // A missing listener is expected before the first user-initiated scan.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch {
    throw new Error(
      "ApplyProof could not access this tab. Open a regular job application page and try again.",
    );
  }
}

export async function scanActivePage(): Promise<PageScan> {
  const tabId = await activeTab();
  await ensureScanner(tabId);
  const response: unknown = await chrome.tabs.sendMessage(tabId, {
    type: "APPLYPROOF_SCAN",
  });
  return pageScanSchema.parse(response);
}

export async function focusField(fieldId: string) {
  const tabId = await activeTab();
  await ensureScanner(tabId);
  const response: unknown = await chrome.tabs.sendMessage(tabId, {
    type: "APPLYPROOF_FOCUS_FIELD",
    fieldId,
  });
  if (!(response as { ok?: boolean })?.ok)
    throw new Error("That field is no longer available on the page.");
}

export async function fillActivePage(
  fills: FieldFill[],
): Promise<FillResult[]> {
  const tabId = await activeTab();
  await ensureScanner(tabId);
  const response: unknown = await chrome.tabs.sendMessage(tabId, {
    type: "APPLYPROOF_FILL_FIELDS",
    fills,
  });
  return pageFillResultSchema.parse(response).results;
}

export async function enableInlineAssistants(
  fields: NormalizedField[],
  job?: PageJobContext,
) {
  const tabId = await activeTab();
  await ensureScanner(tabId);
  const response: unknown = await chrome.tabs.sendMessage(tabId, {
    type: "APPLYPROOF_ENABLE_INLINE_ASSISTANTS",
    fields,
    job,
    generateBlankFields: true,
  });
  if (!(response as { ok?: boolean })?.ok)
    throw new Error("ApplyProof could not add writing tools to this page.");
  return (response as { mountedCount?: number }).mountedCount ?? 0;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
}

export async function attachResumeToActivePage(file: File) {
  const tabId = await activeTab();
  await ensureScanner(tabId);
  const data = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
  const response: unknown = await chrome.tabs.sendMessage(tabId, {
    type: "APPLYPROOF_ATTACH_RESUME",
    file: {
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      data,
    },
  });
  const status = (response as { status?: string })?.status;
  if (
    status !== "attached" &&
    status !== "not_found" &&
    status !== "skipped_existing" &&
    status !== "unsupported"
  ) {
    throw new Error("ApplyProof could not attach the saved resume.");
  }
  return status;
}
