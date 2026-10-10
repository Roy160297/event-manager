chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "run-sync") return false;
  IplanSync.run(chrome.storage.local)
    .then(sendResponse)
    .catch((err) => sendResponse({ status: "error", message: err instanceof Error ? err.message : String(err) }));
  return true;
});
