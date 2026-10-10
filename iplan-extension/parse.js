// Pure parsing of iPlan's pages into plain objects. Runs in the extension's
// offscreen document (it needs DOMParser, which a service worker lacks) and
// is plain JS with no extension APIs so it can also be tried in any page.
(function (root) {
  function docOf(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  function linesOf(html) {
    const doc = docOf(html);
    doc.querySelectorAll("script,style").forEach((el) => el.remove());
    return (doc.body.innerText || doc.body.textContent || "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  // The value on the line after a "label:" line (or on the same line).
  function valueAfter(lines, label, from) {
    for (let i = from || 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === label || line === label + ":") return lines[i + 1] ?? null;
      if (line.startsWith(label + ":") && line.length > label.length + 1) return line.slice(label.length + 1).trim();
    }
    return null;
  }

  function toInt(value) {
    const match = String(value ?? "").match(/-?\d+/);
    return match ? Number(match[0]) : null;
  }

  // Month calendar JSON ({ html }) -> closed events with their quick-view URL.
  function parseMonth(jsonText) {
    const data = JSON.parse(jsonText);
    const doc = docOf(data.html || "");
    const events = [];
    doc.querySelectorAll(".day_contents").forEach((day) => {
      day.querySelectorAll(".event").forEach((el) => {
        if (!/\bstatus-closed\b/.test(el.className)) return;
        const url = el.getAttribute("data-url");
        const id = url && url.match(/events\/(\d+)/);
        if (!id) return;
        events.push({ date: day.getAttribute("data-date"), id: id[1], quickViewUrl: url });
      });
    });
    return events;
  }

  // Quick view: type, title, status, date, times, assigned staff, cloud id.
  function parseQuickView(html) {
    const doc = docOf(html);
    const lines = linesOf(html);
    const dateIndex = lines.findIndex((line) => /^\d{2}\/\d{2}\/\d{4}$/.test(line));
    const status = lines.find((line) => line === "סגור" || line === "פתוח" || line === "בתהליך סגירה" || line === "פוטנציאלי") || null;
    const [d, m, y] = dateIndex >= 0 ? lines[dateIndex].split("/") : [];
    const startLine = dateIndex >= 0 ? lines[dateIndex + 1] : null;
    const endLine = dateIndex >= 0 ? lines[dateIndex + 2] : null;

    const staff = [];
    doc.querySelectorAll(".label.label-light").forEach((label) => {
      const name = label.querySelector(".small:not(.text-muted)")?.textContent.trim();
      const role = label.querySelector(".text-muted")?.textContent.trim();
      if (name && role) staff.push({ name, role });
    });

    const cloud = [...doc.querySelectorAll("a")]
      .map((a) => a.getAttribute("href") || "")
      .map((href) => href.match(/client\/events\/(\d+)(?:$|\?)/))
      .find(Boolean);

    return {
      typeLabel: lines[1] || null,
      title: lines[2] || null,
      status,
      date: y ? `${y}-${m}-${d}` : null,
      startTime: /^\d{1,2}:\d{2}$/.test(startLine || "") ? startLine : null,
      endTime: (endLine || "").match(/(\d{1,2}:\d{2})/)?.[1] || null,
      staff,
      cloudId: cloud ? cloud[1] : null,
    };
  }

  // The event's "cloud" page: couple, signed commitment, meal counts, forms.
  function parseCloud(html) {
    const lines = linesOf(html);

    const users = [];
    const usersAt = lines.indexOf("משתמשים באירוע");
    if (usersAt >= 0) {
      const end = lines.findIndex((line, i) => i > usersAt && line === "הוספה");
      const block = lines.slice(usersAt + 1, end > 0 ? end : usersAt + 40);
      for (let i = 0; i < block.length; i++) {
        if (block[i + 1] === "חתן" || block[i + 1] === "כלה") {
          const user = { name: block[i], role: block[i + 1], phone: null, email: null };
          for (let j = i + 2; j < Math.min(block.length, i + 8); j++) {
            if (/^[\d-]{9,}$/.test(block[j]) && !user.phone) user.phone = block[j];
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(block[j]) && !user.email) user.email = block[j];
          }
          users.push(user);
        }
      }
    }

    // The heading line sometimes carries the status itself ("התחייבות חתומה
    // התקבלה") and sometimes the status is on the following lines ("סטטוס:" /
    // "לא התקבלה") - read both, then check it isn't the negative form.
    const commitmentAt = lines.findIndex((line) => line.startsWith("התחייבות חתומה"));
    const after = commitmentAt >= 0 ? lines.slice(commitmentAt + 1) : [];
    const statusText = commitmentAt >= 0
      ? [lines[commitmentAt].slice("התחייבות חתומה".length), ...after.slice(0, 3)].join(" ")
      : "";
    const received = /(^|\s)התקבלה/.test(statusText) && !/לא התקבלה/.test(statusText);
    const get = (label) => toInt(valueAfter(after, label));

    return {
      users,
      commitmentReceived: received,
      serviceStyle: valueAfter(after, "סוג הגשה"),
      guestsSecure: received ? get("אורחים בטוחים") : null,
      guestsReserve: received ? get("אורחים רזרבה") : null,
      reservePercent: toInt(valueAfter(after, "% רזרבה מקסימלי")),
      kids: received ? get("מנות ילדים") : null,
      glat: received ? get("מנות גלאט") : null,
      vegetarian: received ? get("מנות צמחוניות") : null,
      vegan: received ? get("מנות טבעוניות") : null,
      glutenFree: received ? get("מנות ללא גלוטן") : null,
      toddlers: received ? get("ילדים מתחת לגיל 2") : null,
      isReverse: lines.some((line) => line.includes('לו"ז אירוע') && line.includes("הפוכה")),
    };
  }

  root.IplanParse = { parseMonth, parseQuickView, parseCloud };
})(typeof self !== "undefined" ? self : window);
