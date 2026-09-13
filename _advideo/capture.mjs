// Capture high-res screenshots of ARIA HUB pages for the promo video.
// Uses system Chrome via playwright-core (already in node_modules).
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const ROOT = "D:\\ARIA HUB UPDATE 09 13 2026\\workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)";
const OUT = path.join(ROOT, "_advideo", "shots");
const BASE = "http://localhost:3000";
fs.mkdirSync(OUT, { recursive: true });

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const jobs = [
  // [name, url, setup(page) after load, clip? null = full viewport]
  { name: "01-hero", url: "/en", scrollY: 0 },
  { name: "02-hero-langs", url: "/en", scrollY: 0, langSwitch: true },
  { name: "03-home-opps", url: "/en", scrollSel: "text=Latest", offset: -120 },
  { name: "04-opportunities", url: "/en/opportunities", scrollY: 0 },
  { name: "05-opportunities-cards", url: "/en/opportunities", scrollY: 520 },
  { name: "06-cv-builder", url: "/en/cv-builder", scrollY: 0 },
  { name: "07-cv-builder-form", url: "/en/cv-builder", scrollY: 420 },
  { name: "08-interview-prep", url: "/en/interview-prep", scrollY: 0 },
  { name: "09-deadlines", url: "/en/deadlines", scrollY: 0 },
  { name: "10-success-stories", url: "/en/success-stories", scrollY: 0 },
  { name: "11-visas", url: "/en/visas", scrollY: 0 },
  { name: "12-employers", url: "/en/employers", scrollY: 0 },
  { name: "13-home-fa", url: "/fa", scrollY: 0 },
  { name: "14-home-ps", url: "/ps", scrollY: 0 },
];

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--force-device-scale-factor=2", "--hide-scrollbars", "--disable-animations", "--font-render-hinting=none"],
});

const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  locale: "en-US",
});

const page = await ctx.newPage();
page.setDefaultTimeout(30000);

// Pre-warm every route via plain fetch so Next dev compiles it before capture.
for (const u of [...new Set(jobs.map((j) => j.url))]) {
  for (let a = 1; a <= 5; a++) {
    try { await fetch(BASE + u, { signal: AbortSignal.timeout(60000) }); break; }
    catch { console.log("warm retry " + u + " #" + a); await new Promise((r) => setTimeout(r, 4000)); }
  }
}

for (const job of jobs) {
  let ok = false;
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    try {
      await page.goto(BASE + job.url, { waitUntil: "networkidle", timeout: 60000 });
      ok = true;
    } catch (e) {
      console.log("retry " + job.name + " #" + attempt);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  if (!ok) { console.log("ERR " + job.name + " :: unreachable"); continue; }
  try {
    // Dismiss the consent banner if it is up (clicks persist in localStorage
    // for this browser context, so later pages stay clean).
    for (const label of ["Accept all", "Essential only"]) {
      try {
        const btn = page.locator(`button:has-text("${label}")`).first();
        await btn.click({ timeout: 2500 });
        await page.waitForTimeout(600);
        break;
      } catch {}
    }
    // Hide cookie banners, chat bubbles and Next.js dev overlay for clean ad footage.
    await page.addStyleTag({
      content: "nextjs-portal{display:none!important}",
    }).catch(() => {});
    await page.evaluate(() => {
      const vh = window.innerHeight;
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (cs.position !== "fixed" && cs.position !== "sticky") continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.width === 0) continue;
        // anything pinned near the bottom of the viewport (banners, chat widgets)
        if (r.top > vh - 190 && el.closest("nav,header") === null) {
          el.style.setProperty("display", "none", "important");
        }
      }
      document.documentElement.style.scrollBehavior = "auto";
    });
    await page.waitForTimeout(1500);
    if (job.scrollY) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), job.scrollY);
      await page.waitForTimeout(700);
    }
    if (job.scrollSel) {
      await page.evaluate((sel) => {
        const el = [...document.querySelectorAll("h1,h2,h3,span,div")].find((e) => e.textContent.trim().startsWith(sel.replace("text=", "")));
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "instant" });
      }, job.scrollSel);
      await page.waitForTimeout(700);
    }
    await page.screenshot({ path: path.join(OUT, job.name + ".png") });
    console.log("OK  " + job.name);
  } catch (e) {
    console.log("ERR " + job.name + " :: " + e.message.split("\n")[0]);
  }
}

await browser.close();
console.log("DONE");
