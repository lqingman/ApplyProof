// Opening the panel through Chrome's automatic action behavior does not emit
// action.onClicked, so it does not grant activeTab access to the side panel.
// Keep the action event and open the panel explicitly from that user gesture.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => {
    console.error("Unable to configure ApplyProof side panel", error);
  });

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.sidePanel.open({ tabId: tab.id }).catch((error) => {
    console.error("Unable to open ApplyProof side panel", error);
  });
});
