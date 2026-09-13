// Vertical (1080×1920 @2× DPR) screenshots of the live Persian pages for the
// viral ad. Usage: node _advideo/vshots.mjs   (server on :3000)
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const ROOT = "D:\\ARIA HUB UPDATE 09 13 2026\\workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)";
const OUT = path.join(ROOT, "public", "advideo", "vshots");
fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  { name: "home", url: "/fa" },
  { name: "jobs", url: "/fa/opportunities" },
  { name: "scholarships", url: "/fa/opportunities?category=scholarship" },
  { name: "internships", url: "/fa/opportunities?category=internship" },
  { name: "tools", url: "/fa/templates" },
  { name: "deadlines", url: "/fa/deadlines" },
  { name: "cvb", url: "/fa/cv-builder" },
  { name: "matcher", url: "/fa/opportunity-matcher" },
];

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ["--force-device-scale-factor=2", "--hide-scrollbars", "--font-render-hinting=none"],
});
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2, locale: "fa-AF" });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

let ok = 0, fail = 0;
for (const job of jobs) {
  try {
    const resp = await page.goto("http://localhost:3000" + job.url, { waitUntil: "networkidle", timeout: 60000 });
    if (!resp || !resp.ok()) throw new Error("HTTP " + (resp ? resp.status() : "???"));
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    await page.evaluate(() => {
      const vh = window.innerHeight;
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (cs.position !== "fixed" && cs.position !== "sticky") continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.width === 0) continue;
        if (r.top > vh - 190 && el.closest("nav,header") === null) el.style.setProperty("display", "none", "important");
      }
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 260);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, job.name + ".png") });
    console.log("OK  " + job.name);
    ok++;
  } catch (e) {
    console.log("ERR " + job.name + " :: " + e.message.split("\n")[0]);
    fail++;
  }
}
await browser.close();
console.log(`done: ${ok} ok, ${fail} fail → ${OUT}`);
