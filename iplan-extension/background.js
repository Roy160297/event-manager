// Wakes up every 15 minutes (and when Chrome starts) and asks the offscreen
// document - which has the DOM APIs a service worker lacks - to run a sync.
const ALARM = "iplan-sync";

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DOM_PARSER"],
    justification: "Parse iPlan HTML pages",
  });
}

async function runSync(manual) {
  try {
    await ensureOffscreen();
    const result = await chrome.runtime.sendMessage({ type: "run-sync", manual: !!manual });
    if (result?.status === "idle") return; // not time yet - leave the badge as it was
    const text = result?.status === "ok" ? "" : "!";
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: "#b91c1c" });
    await chrome.action.setTitle({ title: `סנכרון iPlan: ${result?.message ?? "לא ידוע"}` });
  } catch (err) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setTitle({ title: `סנכרון iPlan: ${err instanceof Error ? err.message : err}` });
  }
}

function schedule() {
  // Only a cheap "is it time?" question to the site - iPlan is visited when it says so.
  chrome.alarms.create(ALARM, { periodInMinutes: 15, delayInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(() => {
  schedule();
  runSync(false);
});
chrome.runtime.onStartup.addListener(() => {
  schedule();
  runSync(false);
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) runSync();
});
chrome.action.onClicked.addListener(() => runSync(true));

// The offscreen document has no chrome.storage, so it asks this worker to
// read and write the sync state (which events were already sent).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "storage-get") {
    chrome.storage.local.get(message.keys).then(sendResponse);
    return true;
  }
  if (message?.type === "storage-set") {
    chrome.storage.local.set(message.values).then(() => sendResponse({}));
    return true;
  }
  return false;
});
