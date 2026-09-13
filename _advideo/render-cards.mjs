// Render the 8 ARIA HUB ad cards (1920×1080 @2× DPR) via the card.html
// template served by the local site, using system Chrome.
// Usage: node _advideo/render-cards.mjs
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = "D:\\ARIA HUB UPDATE 09 13 2026\\workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)";
const OUT = path.join(ROOT, "_advideo", "cards");
const SHOTS = path.join(ROOT, "_advideo", "shots");
const PUB_SHOTS = path.join(ROOT, "public", "advideo", "shots");
const BASE = "http://localhost:3000";
fs.mkdirSync(OUT, { recursive: true });

// The card template runs on the site, so scene backgrounds must be same-origin.
fs.mkdirSync(PUB_SHOTS, { recursive: true });
for (const f of ["01-hero.png", "04-opportunities.png", "06-cv-builder.png", "08-interview-prep.png", "11-visas.png"]) {
  const src = path.join(SHOTS, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(PUB_SHOTS, f));
}

const TAGLINE = "Every opportunity, in your language";
const cards = [
  { name: "01-intro", qs: new URLSearchParams({ v: "intro", tagline: TAGLINE }) },
  { name: "02-scene-hero", qs: new URLSearchParams({ v: "scene", bg: "/advideo/shots/01-hero.png", kicker: "Welcome to ARIA HUB", title: "Explore **everything**, one platform", tagline: TAGLINE }) },
  { name: "03-scene-opps", qs: new URLSearchParams({ v: "scene", bg: "/advideo/shots/04-opportunities.png", kicker: "Jobs & Scholarships", title: "**512+** live opportunities right now", tagline: TAGLINE }) },
  { name: "04-scene-cv", qs: new URLSearchParams({ v: "scene", bg: "/advideo/shots/06-cv-builder.png", kicker: "CV Builder", title: "Build a **winning** CV in minutes", tagline: TAGLINE }) },
  { name: "05-scene-interview", qs: new URLSearchParams({ v: "scene", bg: "/advideo/shots/08-interview-prep.png", kicker: "Interview Prep", title: "Walk in **prepared**, walk out hired", tagline: TAGLINE }) },
  { name: "06-scene-visas", qs: new URLSearchParams({ v: "scene", bg: "/advideo/shots/11-visas.png", kicker: "Visa & Travel", title: "Visa guides for **35** countries", tagline: TAGLINE }) },
  { name: "07-stats", qs: new URLSearchParams({ v: "stats", kicker: "The platform in numbers", tagline: TAGLINE, stats: JSON.stringify([
    { num: "512+", lbl: "Live opportunities" },
    { num: "166", lbl: "Organizations hiring" },
    { num: "35", lbl: "Countries covered" },
  ]) }) },
  { name: "08-cta", qs: new URLSearchParams({ v: "cta", title: "Your next opportunity is **waiting**", sub: "Jobs · Scholarships · Visas · CV tools" }) },
];

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ["--force-device-scale-factor=2", "--hide-scrollbars", "--font-render-hinting=none"],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

let ok = 0, fail = 0;
for (const card of cards) {
  try {
    const resp = await page.goto(`${BASE}/advideo/card.html?${card.qs.toString()}`, { waitUntil: "networkidle", timeout: 45000 });
    if (!resp || !resp.ok()) throw new Error(`HTTP ${resp ? resp.status() : "???"} — is the server running with public/advideo present?`);
    await page.waitForFunction("window.__cardReady === true", { timeout: 8000 }).catch(() => { throw new Error("card script did not run (404 or wrong page)"); });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })));
    });
    await page.waitForTimeout(500);
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
