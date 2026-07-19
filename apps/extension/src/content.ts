import { findField, scanDocument } from "./scanner";

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

if (!window.__applyProofScannerReady) {
  window.__applyProofScannerReady = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "APPLYPROOF_SCAN") {
      sendResponse({ ok: true, fields: scanDocument(document) });
      return;
    }
    if (message?.type === "APPLYPROOF_FOCUS_FIELD") {
      sendResponse({ ok: highlightField(String(message.fieldId)) });
    }
  });
}
