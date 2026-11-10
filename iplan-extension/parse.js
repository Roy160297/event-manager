// The only page knowledge kept in the extension: which calendar entries are
// closed events, and a plain dump of any other page (text lines, staff labels,
// links). What the dumps MEAN is worked out by the site, so this file should
// almost never need to change. Needs DOMParser, hence it runs in the offscreen
// document.
(function (root) {
  // iPlan's markup carries inline handlers (onclick="...") and script blocks.
  // DOMParser never runs them, but an extension page's CSP still logs a
  // violation ("Executing inline event handler...") for every one it sees in the
  // parsed string, which fills the extension's error page. Nothing here reads
  // them, so they are dropped from the text before parsing.
  function stripExecutable(html) {
    let out = String(html).replace(/<script\b[\s\S]*?<\/script\s*>/gi, "");
    // One handler per tag per pass (the tag prefix is consumed), so repeat.
    const handler = /(<[a-z][^>]*?)\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
    for (let prev = ""; prev !== out; ) {
      prev = out;
      out = out.replace(handler, "$1");
    }
    return out.replace(/(\s(?:href|src|action|formaction)\s*=\s*["']?)\s*javascript:/gi, "$1#blocked:");
  }

  function docOf(html) {
    return new DOMParser().parseFromString(stripExecutable(html), "text/html");
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

  function dumpPage(html) {
    const doc = docOf(html);
    doc.querySelectorAll("script,style").forEach((el) => el.remove());
    const lines = (doc.body.textContent || "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const labels = [...doc.querySelectorAll(".label.label-light")]
      .map((label) => ({
        name: (label.querySelector(".small:not(.text-muted)") || {}).textContent?.trim() || "",
        role: (label.querySelector(".text-muted") || {}).textContent?.trim() || "",
      }))
      .filter((label) => label.name && label.role);
    const hrefs = [...doc.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((href) => href && href.includes("client/events/"));
    return { lines, labels, hrefs };
  }

  root.IplanParse = { parseMonth, dumpPage };
})(typeof self !== "undefined" ? self : window);
