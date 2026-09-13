// ARIA HUB promo v2 — true frame-by-frame animation renderer.
// Renders animated scenes (logo reveals, staggered text, floating browser
// mockups, aurora backgrounds) frame-by-frame at 30fps via Playwright.
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const ROOT = "D:\\ARIA HUB UPDATE 09 13 2026\\workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)";
const AD = path.join(ROOT, "_advideo");
const FRAMES = path.join(AD, "frames");
const SCENES = path.join(AD, "scenes");
const SHOTS = path.join(AD, "shots");
fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(SCENES, { recursive: true });
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FPS = 30;

const LOGO_DATA = "data:image/png;base64," + fs.readFileSync(path.join(ROOT, "public", "images", "logo-mark.png")).toString("base64");
const shot = (name) => pathToFileURL(path.join(SHOTS, name + ".png")).href;

const ICONS = {
  layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
  briefcase: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
  calendar: '<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v6M16 2v6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a30 30 0 0 1 0 20 30 30 0 0 1 0-20"/>',
  trophy: '<path d="M8 21h8M12 17v4M6 3h12v6a6 6 0 0 1-12 0z"/><path d="M6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Vazirmatn:wght@400;600;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1920px;height:1080px;overflow:hidden}
  body{font-family:Geist,'Segoe UI',sans-serif;background:#060d20;color:#f4f8ff}
  .stage{position:relative;width:1920px;height:1080px;overflow:hidden;
    background:radial-gradient(1500px 950px at 50% 46%,#0c1a3d 0%,#081228 55%,#050a1a 100%)}
  .aurora{position:absolute;width:1500px;height:1000px;border-radius:50%;filter:blur(90px);opacity:.5;mix-blend-mode:screen}
  .au1{background:radial-gradient(closest-side,rgba(37,99,235,.55),transparent 70%);top:-280px;right:-220px;animation:au1 26s ease-in-out infinite alternate}
  .au2{background:radial-gradient(closest-side,rgba(6,182,212,.42),transparent 70%);bottom:-320px;left:-260px;animation:au2 22s ease-in-out infinite alternate}
  @keyframes au1{from{transform:translate(0,0) rotate(0deg) scale(1)}to{transform:translate(-180px,120px) rotate(28deg) scale(1.18)}}
  @keyframes au2{from{transform:translate(0,0) scale(1.1)}to{transform:translate(200px,-140px) scale(.92)}}
  .grid{position:absolute;inset:0;background-image:radial-gradient(rgba(148,187,255,.13) 1.5px,transparent 1.5px);background-size:46px 46px;
    -webkit-mask-image:radial-gradient(1300px 850px at 50% 48%,#000 25%,transparent 78%);mask-image:radial-gradient(1300px 850px at 50% 48%,#000 25%,transparent 78%)}
  .sweep{position:absolute;top:-20%;bottom:-20%;width:420px;left:-500px;transform:rotate(16deg);
    background:linear-gradient(90deg,transparent,rgba(160,200,255,.075),transparent);animation:sweep 3.4s cubic-bezier(.4,0,.3,1) .35s both}
  @keyframes sweep{to{left:2100px}}
  .p{position:absolute;border-radius:50%;background:#bcd4ff;opacity:.5;animation:drift 9s ease-in-out infinite alternate}
  @keyframes drift{from{transform:translate(0,0)}to{transform:translate(26px,-40px)}}
  .maskline{display:block;overflow:hidden}
  .maskline>span{display:block;transform:translateY(112%);animation:rise .85s cubic-bezier(.16,.8,.24,1) both}
  @keyframes rise{to{transform:translateY(0)}}
  .fadeup{opacity:0;transform:translateY(26px);animation:fadeup .7s cubic-bezier(.2,.7,.3,1) both}
  @keyframes fadeup{to{opacity:1;transform:translateY(0)}}
  .fadein{opacity:0;animation:fadein .8s ease both}
  @keyframes fadein{to{opacity:1}}
  .grad{background:linear-gradient(110deg,#5b95ff 0%,#22d3ee 28%,#a5f3fc 50%,#22d3ee 72%,#5b95ff 100%);background-size:230% 100%;
    -webkit-background-clip:text;background-clip:text;color:transparent;animation:shimmer 2.6s .9s ease both}
  @keyframes shimmer{from{background-position:118% 0}to{background-position:-18% 0}}
  .logotile{border-radius:26%;box-shadow:0 14px 55px rgba(37,99,235,.55),0 0 0 1px rgba(160,200,255,.28) inset,0 0 90px rgba(56,189,248,.28);
    animation:logoIn 1s cubic-bezier(.2,.9,.3,1.15) .1s both}
  @keyframes logoIn{from{opacity:0;transform:scale(.62) translateY(-18px);filter:blur(8px)}to{opacity:1;transform:scale(1) translateY(0);filter:blur(0)}}
  .ring{position:absolute;border:2px solid rgba(96,165,250,.55);border-radius:50%;animation:ring 2.2s cubic-bezier(.2,.6,.35,1) .7s both}
  @keyframes ring{from{opacity:.9;transform:scale(.55)}to{opacity:0;transform:scale(2.05)}}
  .chip{display:inline-flex;align-items:center;gap:12px;background:rgba(96,150,255,.12);border:1.5px solid rgba(122,170,255,.4);
    border-radius:999px;padding:14px 30px;font-size:26px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#a5c8ff;
    opacity:0;transform:translateY(-18px);animation:chipIn .6s cubic-bezier(.2,.7,.3,1) both}
  .chip svg{width:26px;height:26px}
  @keyframes chipIn{to{opacity:1;transform:translateY(0)}}
  .bar{height:9px;width:0;border-radius:6px;background:linear-gradient(90deg,#4f8dff,#22d3ee);box-shadow:0 0 26px rgba(56,189,248,.65);animation:bar .6s cubic-bezier(.2,.8,.3,1) both}
  @keyframes bar{to{width:96px}}
  .wm{position:absolute;right:64px;bottom:44px;display:flex;align-items:center;gap:14px;opacity:0;animation:fadein .9s 1.3s both}
  .wm img{width:44px;height:44px;border-radius:12px}
  .wm span{font-size:23px;font-weight:700;letter-spacing:.22em;color:rgba(196,218,255,.6)}
  /* side-by-side product layout: caption left, browser card right */
  .cardglow{position:absolute;right:20px;top:50%;width:1250px;height:850px;transform:translateY(-50%);
    background:radial-gradient(closest-side,rgba(37,99,235,.30),transparent 72%);filter:blur(70px);opacity:0;animation:fadein 1.1s .35s both;z-index:1}
  .persp{position:absolute;right:92px;top:50%;transform:translateY(-50%);width:1055px;perspective:2100px;z-index:3}
  .browser{position:relative;border-radius:18px;overflow:hidden;background:#0d1730;
    box-shadow:0 60px 140px rgba(2,8,28,.9),0 26px 70px rgba(20,80,200,.30),0 0 0 1px rgba(150,190,255,.17);
    opacity:0;transform:translateY(56px) scale(.94);animation:cardIn .95s cubic-bezier(.16,.8,.24,1) .32s both}
  @keyframes cardIn{to{opacity:1;transform:translateY(0) scale(1)}}
  .tiltwrap{transform:rotateY(6.5deg) rotateX(1.5deg);transform-style:preserve-3d}
  .browser .float{animation:floaty 6.5s ease-in-out 1.4s infinite alternate}
  @keyframes floaty{from{transform:translateY(0)}to{transform:translateY(-14px)}}
  .chromebar{height:52px;display:flex;align-items:center;gap:18px;padding:0 24px;background:#0a1226;border-bottom:1px solid rgba(150,190,255,.13)}
  .dots{display:flex;gap:9px}
  .dots i{width:13px;height:13px;border-radius:50%}
  .dots i:nth-child(1){background:#ff6b6b}.dots i:nth-child(2){background:#f7c948}.dots i:nth-child(3){background:#3ddc84}
  .urlbox{flex:1;max-width:520px;margin:0 auto;height:31px;border-radius:8px;background:rgba(148,187,255,.09);border:1px solid rgba(150,190,255,.14);
    display:flex;align-items:center;justify-content:center;gap:10px;font-size:18px;color:#9db9e8}
  .urlbox svg{width:14px;height:14px}
  .shot{display:block;width:100%;height:auto}
  .caption{position:absolute;left:112px;top:50%;transform:translateY(-50%);max-width:660px;z-index:5}
  .caption h1{font-size:67px;font-weight:800;letter-spacing:-.018em;line-height:1.08;margin-top:24px;text-shadow:0 8px 50px rgba(2,10,32,.75)}
  .caption .sub{margin-top:20px;font-size:30px;font-weight:500;color:rgba(222,234,255,.93);text-shadow:0 4px 28px rgba(2,10,32,.8)}
  .vazir{font-family:Vazirmatn}
  .chip{display:inline-flex;align-items:center;gap:11px;background:rgba(96,150,255,.12);border:1.5px solid rgba(122,170,255,.4);
    border-radius:999px;padding:12px 26px;font-size:22px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#a5c8ff;
    opacity:0;transform:translateY(-18px);animation:chipIn .6s cubic-bezier(.2,.7,.3,1) both}
  .chip svg{width:22px;height:22px}
  .btn{display:inline-block;position:relative;overflow:hidden;background:linear-gradient(92deg,#2563eb,#06b6d4);border-radius:999px;
    padding:26px 72px;font-size:43px;font-weight:700;color:#fff;letter-spacing:.02em;box-shadow:0 18px 60px rgba(37,99,235,.5);
    opacity:0;transform:translateY(30px);animation:fadeup .7s cubic-bezier(.2,.7,.3,1) 1.15s both}
  .btn::after{content:"";position:absolute;top:0;bottom:0;width:36%;left:-45%;transform:skewX(-22deg);
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:sheen 2.2s ease-in-out 1.9s infinite}
  @keyframes sheen{from{left:-45%}to{left:135%}}
`;

const particles = (seed) => {
  let out = "";
  let x = 137 * (seed + 3), y = 89 * (seed + 2);
  for (let i = 0; i < 16; i++) {
    x = (x * 31 + 71) % 1820; y = (y * 23 + 37) % 980;
    const s = 3 + ((x + y) % 5);
    out += `<i class="p" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;animation-delay:${(i * 0.7).toFixed(1)}s;animation-duration:${(7 + (i % 5)).toFixed(1)}s;opacity:${(0.22 + (i % 4) * 0.11).toFixed(2)}"></i>`;
  }
  return out;
};

const shell = (body, durClass = "") => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${durClass}</style></head><body><div class="stage">
  <div class="aurora au1"></div><div class="aurora au2"></div><div class="grid"></div>${particles(1)}
  ${body}
</div></body></html>`;

// ---------- scene builders ----------
function hookScene() {
  return shell(`
    <div class="sweep"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:4">
      <div style="position:relative;margin-bottom:46px">
        <img class="logotile" src="${LOGO_DATA}" style="width:128px;height:128px">
      </div>
      <div class="chip" style="animation-delay:.55s"><span style="width:11px;height:11px;border-radius:50%;background:#38bdf8;box-shadow:0 0 16px #38bdf8"></span>New opportunities every day</div>
      <div style="font-size:116px;line-height:1.07;font-weight:800;letter-spacing:-.022em;margin-top:44px">
        <span class="maskline"><span style="animation-delay:.72s">One platform.</span></span>
        <span class="maskline"><span class="grad" style="animation-delay:.95s">Every opportunity.</span></span>
      </div>
      <div class="fadeup" style="animation-delay:1.35s;margin-top:46px;font-size:36px;font-weight:600;color:rgba(214,230,255,.94);letter-spacing:.01em">
        Jobs&nbsp;&nbsp;•&nbsp;&nbsp;Scholarships&nbsp;&nbsp;•&nbsp;&nbsp;Internships&nbsp;&nbsp;•&nbsp;&nbsp;Training
      </div>
      <div class="fadeup" style="animation-delay:1.6s;margin-top:34px;display:flex;align-items:center;gap:16px;opacity:.85">
        <span class="vazir" style="font-size:26px;color:#9db9e8">آریا هاب</span>
        <span style="width:5px;height:5px;border-radius:50%;background:#4f6fa0"></span>
        <span style="font-size:24px;font-weight:700;letter-spacing:.3em;color:#9db9e8">ARIA HUB</span>
      </div>
    </div>`);
}

function mockScene({ img, url, chipIcon, chip, title, sub }) {
  return shell(`
    <div class="cardglow"></div>
    <div class="persp">
      <div class="browser"><div class="tiltwrap"><div class="float">
        <div class="chromebar"><div class="dots"><i></i><i></i><i></i></div>
          <div class="urlbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>${url}</div>
          <div style="width:72px"></div></div>
        <img class="shot" src="${img}">
      </div></div></div>
    </div>
    <div class="caption">
      <div class="chip" style="animation-delay:.58s">${icon(chipIcon)}${chip}</div>
      <span class="maskline"><h1><span style="animation-delay:.74s">${title}</span></h1></span>
      <div class="sub fadeup" style="animation-delay:1.05s">${sub}</div>
    </div>
    <div class="wm"><img src="${LOGO_DATA}"><span>ARIA HUB</span></div>`);
}

function ctaScene() {
  return shell(`
    <div class="sweep" style="animation-delay:1.2s"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:4">
      <div style="position:relative;margin-bottom:38px;width:150px;height:150px;display:flex;align-items:center;justify-content:center">
        <i class="ring" style="width:150px;height:150px;left:0;top:0"></i>
        <i class="ring" style="width:150px;height:150px;left:0;top:0;animation-delay:1.05s"></i>
        <img class="logotile" src="${LOGO_DATA}" style="width:132px;height:132px">
      </div>
      <div class="fadeup" style="animation-delay:.5s;font-size:52px;font-weight:800;letter-spacing:.02em;line-height:1">ARIA <span class="grad" style="font-weight:800">HUB</span></div>
      <span class="maskline" style="margin-top:26px"><div style="font-size:96px;font-weight:800;letter-spacing:-.02em;line-height:1.06"><span style="animation-delay:.72s">Start your journey today</span></div></span>
      <div class="fadeup" style="animation-delay:1s;margin-top:24px;font-size:35px;color:rgba(214,230,255,.9);font-weight:500">Jobs, scholarships &amp; opportunities in Afghanistan</div>
      <div class="btn" style="margin-top:52px">www.myariahub.com</div>
      <div class="fadeup" style="animation-delay:1.45s;margin-top:36px;font-size:29px;color:#9db9e8;font-weight:600">English&nbsp;&nbsp;·&nbsp;&nbsp;<span class="vazir">فارسی</span>&nbsp;&nbsp;·&nbsp;&nbsp;<span class="vazir">پښتو</span></div>
    </div>`);
}

// ---------- scene table ----------
const table = [
  ["s1-hook", 120, () => hookScene()],
  ["s2-hero", 126, () => mockScene({ img: shot("01-hero"), url: "myariahub.com", chipIcon: "layers", chip: "The platform", title: "Everything, in one place", sub: "Jobs, scholarships &amp; opportunities — updated daily" })],
  ["s3-opps", 120, () => mockScene({ img: shot("04-opportunities"), url: "myariahub.com/opportunities", chipIcon: "briefcase", chip: "Opportunities", title: "New opportunities every day", sub: "<b>512 active listings</b> · 166 trusted organizations" })],
  ["s4-cv", 108, () => mockScene({ img: shot("06-cv-builder"), url: "myariahub.com/cv-builder", chipIcon: "file", chip: "CV Builder", title: "A professional CV in minutes", sub: "Fill in your details — export a polished PDF" })],
  ["s5-interview", 102, () => mockScene({ img: shot("08-interview-prep"), url: "myariahub.com/interview-prep", chipIcon: "mic", chip: "Interview prep", title: "Walk in prepared", sub: "Practice with AI and real scenarios" })],
  ["s6-deadlines", 108, () => mockScene({ img: shot("09-deadlines"), url: "myariahub.com/deadlines", chipIcon: "calendar", chip: "Deadlines", title: "Never miss a deadline", sub: "Closing-soon opportunities, sorted by urgency" })],
  ["s7-langs", 114, () => mockScene({ img: shot("13-home-fa"), url: "myariahub.com/fa", chipIcon: "globe", chip: "3 languages", title: "In your language", sub: `English&nbsp;&nbsp;·&nbsp;&nbsp;<span class="vazir">فارسی</span>&nbsp;&nbsp;·&nbsp;&nbsp;<span class="vazir">پښتو</span>` })],
  ["s8-success", 108, () => mockScene({ img: shot("10-success-stories"), url: "myariahub.com/success-stories", chipIcon: "trophy", chip: "Success stories", title: "Real people. Real success.", sub: "Scholarships landed · jobs signed · visas stamped" })],
  ["s9-cta", 138, () => ctaScene()],
];

const only = process.argv[2] ? process.argv[2].split(",") : null;

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ["--allow-file-access-from-files", "--font-render-hinting=none", "--disable-lcd-text"],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

for (const [name, frames, build] of table) {
  if (only && !only.includes(name)) continue;
  const dir = path.join(FRAMES, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const htmlPath = path.join(SCENES, name + ".html");
  fs.writeFileSync(htmlPath, build());
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => {
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
    }, Math.round(f * 1000 / FPS));
    await page.screenshot({ path: path.join(dir, "f" + String(f).padStart(4, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  await page.close();
  console.log(`frames ${name}: ${frames} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
console.log("FRAMES_DONE");
