function injectScripts(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      await import(chrome.runtime.getURL(`content.js?t=${Date.now()}`));
    }
  }).then(() => {
    console.log("content.js injected:", tabId);
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;

  injectScripts(tab.id).catch((error) => {
    console.error("Failed to inject scripts:", error);
  });
});
