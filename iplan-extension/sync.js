// One sync pass: read the closed upcoming events from iPlan (read-only GETs,
// using the browser's own logged-in session) and hand the raw pages to the
// site, which works out what changed. Deliberately thin - see parse.js.
(function (root) {
  class LoginRequired extends Error {}

  const NEAR_DAYS = 45; // events this close are re-read every pass
  const FAR_EVERY_MS = 6 * 60 * 60 * 1000; // the rest only every few hours
  const MONTHS_AHEAD = 8;
  const BATCH = 10;
  const PAUSE_MS = 250; // be gentle with iPlan

  const cfg = () => root.IPLAN_SYNC_CONFIG;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const base = () => `https://app.iplan.co.il/he-IL/corp/companies/${cfg().companyId}`;

  function israelToday() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  }

  function daysBetween(fromIso, toIso) {
    return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);
  }

  function monthDates(year, month) {
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
  }

  async function iplanGet(url, asJson) {
    const response = await fetch(url, {
      credentials: "include",
      headers: asJson ? { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" } : {},
    });
    if ((response.redirected && /sign_in/.test(response.url)) || response.status === 401 || response.status === 403) {
      throw new LoginRequired();
    }
    const text = await response.text();
    if (!response.ok) throw new Error(`iPlan החזירה שגיאה ${response.status}`);
    if (asJson && !text.trimStart().startsWith("{")) throw new LoginRequired();
    return text;
  }

  async function collectClosedEvents(today) {
    const [startYear, startMonth] = today.split("-").map(Number);
    const found = new Map();
    for (let i = 0; i < MONTHS_AHEAD; i++) {
      const monthIndex = startMonth - 1 + i;
      const dates = monthDates(startYear + Math.floor(monthIndex / 12), monthIndex % 12);
      const query = dates.map((d) => `dates[]=${d}`).join("&") + "&filters[event_status][]=closed&api_version=1.0.0";
      const text = await iplanGet(`${base()}/calendar/month_view/events?${query}`, true);
      for (const event of root.IplanParse.parseMonth(text)) {
        if (event.date >= today && !found.has(event.id)) found.set(event.id, event);
      }
      await sleep(PAUSE_MS);
    }
    return [...found.values()];
  }

  async function readEvent(item) {
    const quick = root.IplanParse.dumpPage(await iplanGet(`https://app.iplan.co.il${item.quickViewUrl}`, false));
    const cloudId = quick.hrefs.map((href) => href.match(/client\/events\/(\d+)(?:$|\?)/)).find(Boolean);
    const cloud = cloudId
      ? root.IplanParse.dumpPage(await iplanGet(`${base()}/client/events/${cloudId[1]}`, false))
      : null;
    return { id: item.id, date: item.date, quick, cloud };
  }

  async function post(body) {
    if (typeof cfg().post === "function") return cfg().post(body); // tests only
    const { appUrl, token } = cfg();
    const response = await fetch(`${appUrl}/api/iplan/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`האתר החזיר שגיאה ${response.status}`);
    return response.json();
  }

  // options.force: also re-read the far-off events now (a manual click).
  async function run(storage, options) {
    const force = !!(options && options.force);
    const today = israelToday();
    const saved = await storage.get(["lastFar"]);
    const doFar = force || !saved.lastFar || Date.now() - saved.lastFar > FAR_EVERY_MS;

    let items;
    try {
      items = await collectClosedEvents(today);
    } catch (err) {
      const login = err instanceof LoginRequired;
      await post({ status: login ? "login_required" : "error", error: login ? "iPlan מבקשת התחברות מחדש" : String(err.message || err) });
      return { status: login ? "login_required" : "error", message: login ? "נדרשת התחברות ל-iPlan" : String(err.message || err) };
    }

    const todo = items.filter((item) => doFar || daysBetween(today, item.date) <= NEAR_DAYS);
    const pages = [];
    const errors = [];
    for (const item of todo) {
      try {
        pages.push(await readEvent(item));
      } catch (err) {
        if (err instanceof LoginRequired) {
          await post({ status: "login_required", error: "iPlan מבקשת התחברות מחדש" });
          return { status: "login_required", message: "נדרשת התחברות ל-iPlan" };
        }
        errors.push(`${item.id}: ${err.message || err}`);
      }
      await sleep(PAUSE_MS);
    }

    const error = errors.length ? errors.slice(0, 5).join(" | ") : undefined;
    const batches = pages.length ? [] : [[]];
    for (let i = 0; i < pages.length; i += BATCH) batches.push(pages.slice(i, i + BATCH));
    for (const batch of batches) await post({ status: "ok", pages: batch, error });

    if (doFar) await storage.set({ lastFar: Date.now() });
    return {
      status: "ok",
      message: `נבדקו ${pages.length} אירועים${errors.length ? `, ${errors.length} שגיאות` : ""}`,
    };
  }

  root.IplanSync = { run, LoginRequired };
})(typeof self !== "undefined" ? self : window);
