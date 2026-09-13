// Render all vertical cards (1080×1920 @2× DPR) for the Persian reels ad.
// Usage: node _advideo/render-vcards.mjs   (server on :3000, public/advideo served)
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const ROOT = "D:\\ARIA HUB UPDATE 09 13 2026\\workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)";
const OUT = path.join(ROOT, "_advideo", "vcards");
fs.mkdirSync(OUT, { recursive: true });

const S = (f) => `/advideo/vshots/${f}.png`;
const cards = [
  // Scene 1 — kinetic hook words (one card per word)
  { name: "h1", qs: { v: "hook", w: "چرا", size: "220" } },
  { name: "h2", qs: { v: "hook", w: "هیچ‌کس", size: "190" } },
  { name: "h3", qs: { v: "hook", w: "به دانشجوها", size: "130" } },
  { name: "h4", qs: { v: "hook", w: "نمی‌گه؟", size: "170", gold: "1" } },
  { name: "f1", qs: { v: "flash", w: "کار." } },
  { name: "f2", qs: { v: "flash", w: "بورسیه." } },
  { name: "f3", qs: { v: "flash", w: "کارآموزی." } },
  // Scene 2 — mystery browser
  { name: "m1", qs: { v: "mystery", bg: S("home"), blur: "26", line: "یک **وب‌سایت** پیدا کردم…" } },
  { name: "m2", qs: { v: "mystery", bg: S("home"), blur: "7", line: "…کاش **زودتر** پیدا کرده بودم" } },
  // Scene 3 — reveal
  { name: "reveal", qs: { v: "reveal", bg: S("home"), line: "همه‌ی فرصت‌ها، **یک جا**" } },
  // Scene 4 — rapid sections
  { name: "s-jobs", qs: { v: "show", bg: S("jobs"), label: "کارها" } },
  { name: "s-sch", qs: { v: "show", bg: S("scholarships"), label: "بورسیه‌ها" } },
  { name: "s-int", qs: { v: "show", bg: S("internships"), label: "کارآموزی" } },
  { name: "s-tools", qs: { v: "show", bg: S("cvb"), label: "ابزارهای شغلی" } },
  { name: "s-dead", qs: { v: "show", bg: S("deadlines"), label: "منابع دانشجویی" } },
  // Scene 5 — FOMO pops (n cards visible)
  { name: "pop1", qs: { v: "fomopop", bg: S("jobs"), n: "1" } },
  { name: "pop2", qs: { v: "fomopop", bg: S("jobs"), n: "2" } },
  { name: "pop3", qs: { v: "fomopop", bg: S("jobs"), n: "3" } },
  { name: "opp1", qs: { v: "opp", badge: "بورسیه", org: "UK Foreign, Commonwealth & Development Office", ttl: "Chevening Scholarships 2026–27", country: "🇬🇧 بریتانیا", deadline: "⏰ ددلاین: ۱۵ اکتوبر ۲۰۲۶", line: "فرصتی که دنبالشی…" } },
  { name: "opp2", qs: { v: "opp", badge: "بورسیه", org: "UK Foreign, Commonwealth & Development Office", ttl: "Chevening Scholarships 2026–27", country: "🇬🇧 بریتانیا", deadline: "⏰ ددلاین: ۱۵ اکتوبر ۲۰۲۶", line: "…**شاید همین‌جا** باشه" } },
  // Scene 6 — CTA
  { name: "c1", qs: { v: "ctatext", w: "بعداً نشنو.", size: "130" } },
  { name: "c2", qs: { v: "ctatext", w: "همین حالا **کشف** کن.", size: "100", gold: "1" } },
  { name: "sitecta", qs: { v: "sitecta", bg: S("home"), ripple: "1", sub: "کار · بورسیه · ویزا · ابزار شغلی" } },
  { name: "end", qs: { v: "endcard" } },
];

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ["--force-device-scale-factor=2", "--hide-scrollbars", "--font-render-hinting=none"],
});
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2, locale: "fa-AF" });
const page = await ctx.newPage();

let ok = 0, fail = 0;
for (const card of cards) {
  const qs = new URLSearchParams(card.qs).toString();
  try {
    const resp = await page.goto(`http://localhost:3000/advideo/vcard.html?${qs}`, { waitUntil: "networkidle", timeout: 45000 });
    if (!resp || !resp.ok()) throw new Error("HTTP " + (resp ? resp.status() : "???"));
    await page.waitForFunction("window.__cardReady === true", { timeout: 8000 }).catch(() => { throw new Error("card script did not run"); });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
      // background-image URLs aren't <img> — verify each one really resolves
      const bgUrls = [...document.querySelectorAll("*")]
        .map((el) => getComputedStyle(el).backgroundImage)
        .join(" ").match(/url\("?([^")]+)"?\)/g)?.map((m) => m.replace(/url\("|"\)/g, "")) ?? [];
      const bad = [];
      for (const u of [...new Set(bgUrls)]) {
        try { const r = await fetch(u, { method: "HEAD" }); if (!r.ok) bad.push(u + " → " + r.status); }
        catch { bad.push(u + " → fetch failed"); }
      }
      if (bad.length) throw new Error("background image failed: " + bad.join(", "));
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, card.name + ".png") });
    console.log("OK  " + card.name);
    ok++;
  } catch (e) {
    console.log("ERR " + card.name + " :: " + e.message.split("\n")[0]);
    fail++;
  }
}
await browser.close();
console.log(`done: ${ok} ok, ${fail} fail → ${OUT}`);
