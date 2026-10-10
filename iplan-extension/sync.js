// One sync pass: read the closed upcoming events from iPlan (read-only GETs,
// using the browser's own logged-in session) and send what changed to the app.
(function (root) {
  class LoginRequired extends Error {}

  const NEAR_DAYS = 45; // events this close are re-read every pass
  const FAR_EVERY_MS = 6 * 60 * 60 * 1000; // the rest only every few hours
  const MONTHS_AHEAD = 8;
  const BATCH = 15;
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

  function isFridayDate(isoDate) {
    return !!isoDate && new Date(`${isoDate}T00:00:00Z`).getUTCDay() === 5;
  }

  // The venue only runs the "reverse" wedding format on Fridays, and iPlan
  // marks it only through the schedule form attached to the event - so a
  // Friday wedding counts as reverse even before that form exists.
  function mapEventType(typeLabel, serviceStyle, isReverse, isoDate) {
    const label = typeLabel || "";
    if (label.includes("חתונה")) {
      const service = serviceStyle === "הגשה";
      if (isReverse || isFridayDate(isoDate)) return service ? "reverse_wedding_service" : "reverse_wedding";
      return service ? "wedding_service" : "wedding";
    }
    if (label.includes("בר מצווה")) return "bar_mitzvah";
    if (label.includes("בת מצווה")) return "bat_mitzvah";
    if (label.includes("עסקי")) return "business_event";
    return "other";
  }

  // Same shape the screenshot import reads off iPlan's event screen.
  function buildPayload(item, quick, cloud) {
    const bride = cloud.users.find((u) => u.role === "כלה") || null;
    const groom = cloud.users.find((u) => u.role === "חתן") || null;
    const isWedding = (quick.typeLabel || "").includes("חתונה") && (bride || groom);
    const staffByRole = (role) => quick.staff.find((s) => s.role === role)?.name || null;
    const contacts = [bride, groom].filter(Boolean);
    // "עדיין לא נקבע" (not decided yet) is not a style.
    const style = cloud.serviceStyle === "מזנונים" || cloud.serviceStyle === "הגשה" ? cloud.serviceStyle : null;

    return {
      iplan_event_id: item.id,
      confirmed: quick.status === "סגור",
      title: quick.title,
      floor_manager_name: staffByRole("מנהל פלור"),
      extraction: {
        bride_name: isWedding ? (bride && bride.name) || null : quick.title,
        groom_name: isWedding ? (groom && groom.name) || null : null,
        event_type: mapEventType(quick.typeLabel, style, cloud.isReverse, quick.date),
        event_date: quick.date,
        start_time: quick.startTime,
        end_time: quick.endTime,
        event_manager_name: staffByRole("מנהל אירוע"),
        sales_person_name: staffByRole("מכירות"),
        service_style: style,
        contact_phone: (contacts[0] && contacts[0].phone) || null,
        contact_phone_2: (contacts[1] && contacts[1].phone) || null,
        contact_email: (contacts[0] && contacts[0].email) || null,
        contact_email_2: (contacts[1] && contacts[1].email) || null,
        guests_secure: cloud.guestsSecure,
        guests_reserve: cloud.guestsReserve,
        guests_reserve_percent: cloud.guestsReserve == null ? cloud.reservePercent : null,
        kids_meals: cloud.kids,
        glat_meals: cloud.glat,
        vegetarian_meals: cloud.vegetarian,
        vegan_meals: cloud.vegan,
        gluten_free_meals: cloud.glutenFree,
        toddlers_under_2: cloud.toddlers,
        source_type: "iplan_screen",
      },
    };
  }

  async function readEvent(item) {
    const quick = root.IplanParse.parseQuickView(await iplanGet(`https://app.iplan.co.il${item.quickViewUrl}`, false));
    if (!quick.date) throw new Error("מבנה כרטיס האירוע ב-iPlan השתנה (לא נמצא תאריך)");
    const cloud = quick.cloudId
      ? root.IplanParse.parseCloud(await iplanGet(`${base()}/client/events/${quick.cloudId}`, false))
      : root.IplanParse.parseCloud("");
    return buildPayload(item, quick, cloud);
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

  // dryRun: only ask the app what it would do (nothing is written anywhere).
  async function run(storage, options) {
    const dryRun = !!(options && options.dryRun);
    const today = israelToday();
    const saved = dryRun ? {} : await storage.get(["hashes", "lastFar"]);
    const hashes = saved.hashes || {};
    const doFar = dryRun || !saved.lastFar || Date.now() - saved.lastFar > FAR_EVERY_MS;

    let items;
    try {
      items = await collectClosedEvents(today);
    } catch (err) {
      const login = err instanceof LoginRequired;
      if (!dryRun) await post({ status: login ? "login_required" : "error", error: login ? "iPlan מבקשת התחברות מחדש" : String(err.message || err) });
      return { status: login ? "login_required" : "error", message: login ? "נדרשת התחברות ל-iPlan" : String(err.message || err) };
    }

    const todo = items.filter((item) => doFar || daysBetween(today, item.date) <= NEAR_DAYS);
    const payloads = [];
    const errors = [];
    for (const item of todo) {
      try {
        payloads.push(await readEvent(item));
      } catch (err) {
        if (err instanceof LoginRequired) {
          if (!dryRun) await post({ status: "login_required", error: "iPlan מבקשת התחברות מחדש" });
          return { status: "login_required", message: "נדרשת התחברות ל-iPlan" };
        }
        errors.push(`${item.id}: ${err.message || err}`);
      }
      await sleep(PAUSE_MS);
    }

    const changed = dryRun ? payloads : payloads.filter((p) => hashes[p.iplan_event_id] !== JSON.stringify(p));
    const batches = changed.length ? [] : [[]];
    for (let i = 0; i < changed.length; i += BATCH) batches.push(changed.slice(i, i + BATCH));

    // The very first run imports everything already in iPlan - the app skips
    // its "new event" notifications for that one pass.
    const initial = !dryRun && Object.keys(hashes).length === 0;
    const allResults = [];
    for (const events of batches) {
      const answer = await post({ status: "ok", events, dry_run: dryRun, initial, error: errors.length ? errors.slice(0, 5).join(" | ") : undefined });
      for (const result of answer.results || []) {
        allResults.push(result);
        if (dryRun || result.action === "skipped") continue;
        const payload = events.find((p) => p.iplan_event_id === result.iplan_event_id);
        if (payload) hashes[payload.iplan_event_id] = JSON.stringify(payload);
      }
    }

    if (!dryRun) await storage.set({ hashes, ...(doFar ? { lastFar: Date.now() } : {}) });
    return {
      status: "ok",
      message: `נבדקו ${payloads.length} אירועים, ${changed.length} נשלחו${errors.length ? `, ${errors.length} שגיאות` : ""}`,
      results: allResults,
      errors,
    };
  }

  root.IplanSync = { run, buildPayload, mapEventType, LoginRequired };
})(typeof self !== "undefined" ? self : window);
