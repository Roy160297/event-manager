// The only page knowledge kept in the extension: which calendar entries are
// closed events, and a plain dump of any other page (text lines, staff labels,
// links). What the dumps MEAN is worked out by the site, so this file should
// almost never need to change. Needs DOMParser, hence it runs in the offscreen
// document.
(function (root) {
  function docOf(html) {
    return new DOMParser().parseFromString(html, "text/html");
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
