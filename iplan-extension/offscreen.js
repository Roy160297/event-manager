// Same get/set shape as chrome.storage.local, relayed through the service worker.
const remoteStorage = {
  get: (keys) => chrome.runtime.sendMessage({ type: "storage-get", keys }),
  set: (values) => chrome.runtime.sendMessage({ type: "storage-set", values }),
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "run-sync") return false;
  IplanSync.run(remoteStorage, { manual: !!message.manual })
    .then(sendResponse)
    .catch((err) => sendResponse({ status: "error", message: err instanceof Error ? err.message : String(err) }));
  return true;
});
