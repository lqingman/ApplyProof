import { countBlockedFields, findField, scanDocument } from "./scanner";
import { fillDocument } from "./pageFill";
import { mountInlineAssistants } from "./inlineAssistant";
import { attachResumeFile } from "./resumeAttachment";
import { extractJobContext } from "./jobContext";
import type { NormalizedField } from "@applyproof/shared-types";

declare global {
  interface Window {
    __applyProofScannerReady?: boolean;
  }
}

const highlightClass = "applyproof-field-highlight";

function installStyles() {
  if (document.getElementById("applyproof-scanner-styles")) return;
  const style = document.createElement("style");
  style.id = "applyproof-scanner-styles";
  style.textContent = `
    .${highlightClass} {
      outline: 3px solid #2b8a62 !important;
      outline-offset: 4px !important;
      transition: outline-color 180ms ease;
    }
  `;
  document.head.append(style);
}

function highlightField(fieldId: string) {
  const element = findField(document, fieldId);
  if (!(element instanceof HTMLElement)) return false;
  installStyles();
  document
    .querySelectorAll(`.${highlightClass}`)
    .forEach((node) => node.classList.remove(highlightClass));
  element.classList.add(highlightClass);
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.focus({ preventScroll: true });
  window.setTimeout(() => element.classList.remove(highlightClass), 2400);
  return true;
}

function resumeFileFrom(message: unknown) {
  const payload = message as {
    name?: string;
    type?: string;
    lastModified?: number;
    data?: string;
  };
  if (!payload.name || !payload.data) return null;
  const binary = atob(payload.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], payload.name, {
    type: payload.type ?? "",
    lastModified: payload.lastModified,
  });
}

if (!window.__applyProofScannerReady) {
  window.__applyProofScannerReady = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "APPLYPROOF_PING") {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "APPLYPROOF_SCAN") {
      sendResponse({
        ok: true,
        fields: scanDocument(document),
        blockedCount: countBlockedFields(document),
        job: extractJobContext(document),
      });
      return;
    }
    if (message?.type === "APPLYPROOF_FOCUS_FIELD") {
      sendResponse({ ok: highlightField(String(message.fieldId)) });
      return;
    }
    if (message?.type === "APPLYPROOF_FILL_FIELDS") {
      sendResponse({
        ok: true,
        results: fillDocument(
          document,
          Array.isArray(message.fills) ? message.fills : [],
        ),
      });
      return;
    }
    if (message?.type === "APPLYPROOF_ATTACH_RESUME") {
      const file = resumeFileFrom(message.file);
      sendResponse(
        file ? attachResumeFile(document, file) : { status: "unsupported" },
      );
      return;
    }
    if (message?.type === "APPLYPROOF_ENABLE_INLINE_ASSISTANTS") {
      const fields = Array.isArray(message.fields)
        ? (message.fields as NormalizedField[])
        : [];
      sendResponse({
        ok: true,
        mountedCount: mountInlineAssistants(document, fields, {
          generateBlankFields: message.generateBlankFields === true,
          job: message.job,
        }),
      });
    }
  });
}
