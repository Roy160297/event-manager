// One sync pass: read the closed upcoming events from iPlan (read-only GETs,
// using the browser's own logged-in session) and hand the raw pages to the
// site, which works out what changed. Deliberately thin - see parse.js.
(function (root) {
  class LoginRequired extends Error {}

  const NEAR_DAYS = 45; // events this close are re-read every pass
  const FAR_EVERY_MS = 12 * 60 * 60 * 1000; // the rest only every few hours
  const MONTHS_AHEAD = 8;
  const BATCH = 10;
  const PAUSE_MS = 250; // base pause between requests; each one is randomised

  const cfg = () => root.IPLAN_SYNC_CONFIG;
  // A pause between 1.2x and 3x the base, so the requests are not evenly spaced.
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms * (1.2 + Math.random() * 1.8)));
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

  // A file download (the guest list), returned as base64 so it can travel in JSON.
  async function iplanGetBase64(url) {
    const response = await fetch(url, { credentials: "include" });
    if ((response.redirected && /sign_in/.test(response.url)) || response.status === 401 || response.status === 403) {
      throw new LoginRequired();
    }
    if (!response.ok) throw new Error(`iPlan החזירה שגיאה ${response.status}`);
    if (/text\/html/.test(response.headers.get("content-type") || "")) throw new LoginRequired();
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
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

  const cloudIds = new Map(); // iPlan event id -> id of its "cloud" page, used for the per-event files

  async function readEvent(item) {
    const quick = root.IplanParse.dumpPage(await iplanGet(`https://app.iplan.co.il${item.quickViewUrl}`, false));
    const cloudId = quick.hrefs.map((href) => href.match(/client\/events\/(\d+)(?:$|\?)/)).find(Boolean);
    if (cloudId) cloudIds.set(item.id, cloudId[1]);
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

  // options.manual: a click on the icon - go to iPlan now and re-read the far-off
  // events too. Otherwise the site decides whether it is time (and whether to
  // re-read everything), so the pace can be changed from the site.
  async function run(storage, options) {
    let force = !!(options && options.manual);
    // Always ask the site first - it can be switched off there.
    const decision = await post({ status: "poll", manual: force });
    if (decision.disabled) return { status: "idle", message: "הסנכרון כבוי בהגדרות האתר" };
    if (!force) {
      if (!decision.run) return { status: "idle", message: "לא נדרש סנכרון כרגע" };
      force = !!decision.force;
    }
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

    // Per-event files the site says are due: the hall sketch the day before the
    // event, the guest list on the day. The site works out what they contain.
    try {
      const due = await post({ status: "due", manual: !!(options && options.manual) });
      const wanted = [
        ...(due.sketch || []).map((id) => ["sketch", id]),
        ...(due.guests || []).map((id) => ["guests", id]),
      ];
      for (const [kind, id] of wanted) {
        const cloudId = cloudIds.get(id);
        if (!cloudId) continue;
        try {
          const file =
            kind === "sketch"
              ? { html: await iplanGet(`${base()}/client/events/${cloudId}/venue_design/sketch/export.print`, false) }
              : { base64: await iplanGetBase64(`${base()}/client/events/${cloudId}/reports/invitations.xls`) };
          await post({ status: "files", files: [{ iplan_event_id: id, kind, ...file }] });
        } catch (err) {
          if (err instanceof LoginRequired) {
            await post({ status: "login_required", error: "iPlan מבקשת התחברות מחדש" });
            return { status: "login_required", message: "נדרשת התחברות ל-iPlan" };
          }
          errors.push(`${kind} ${id}: ${err.message || err}`);
        }
        await sleep(PAUSE_MS);
      }
    } catch (err) {
      errors.push(`קבצי אירוע: ${err.message || err}`);
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
