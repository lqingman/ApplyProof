import { pageScanSchema, type NormalizedField } from "@applyproof/shared-types";

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("Open a job application tab and try again.");
  return tab.id;
}

async function ensureScanner(tabId: number) {
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

export async function scanActivePage(): Promise<NormalizedField[]> {
  const tabId = await activeTab();
  await ensureScanner(tabId);
  const response: unknown = await chrome.tabs.sendMessage(tabId, {
    type: "APPLYPROOF_SCAN",
  });
  return pageScanSchema.parse(response).fields;
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
