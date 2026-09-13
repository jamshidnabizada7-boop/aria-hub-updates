/**
 * One-time Jobs.af login helper.
 *
 * Jobs.af hides the full job fact sheet + description behind a login. The
 * scraper uses a persistent browser profile (.browser-profile/); run THIS
 * script once, log in manually in the window that opens, and the saved
 * session unlocks detail pages for every later automated run (headless).
 *
 * Usage:  bun run scripts/jobsaf-login.ts
 */

import { chromium } from 'playwright-core';
import { getProfileDir, resolveExecutable } from '../src/lib/import/scrapers/browser-fetch';

async function main() {
  const exe = resolveExecutable();
  if (!exe) {
    console.error('✗ No Chrome/Edge executable found. Set CHROME_PATH and retry.');
    process.exit(1);
  }

  console.log(`Opening browser (profile: ${getProfileDir()}) …`);
  const context = await chromium.launchPersistentContext(getProfileDir(), {
    executablePath: exe,
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto('https://www.jobs.af/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  console.log('→ A browser window is open. Please log in to Jobs.af now.');
  console.log('  (The session is saved to the profile the moment login succeeds.)');
  console.log('  Polling for login… (up to 5 minutes, Ctrl+C to abort)');

  const deadline = Date.now() + 5 * 60 * 1000;
  let loggedIn = false;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const html = await page.content();
      const onLoginPage = /type=["']password["']/.test(html);
      if (!onLoginPage) {
        // A password field somewhere on the page means the login form is
        // still in front of us. Once it disappears, treat the session as on.
        loggedIn = true;
        break;
      }
    } catch {
      /* navigation in flight — keep polling */
    }
  }

  if (loggedIn) {
    // Give the site a moment to write its session cookie before closing.
    await new Promise((r) => setTimeout(r, 3000));
    console.log('✓ Login captured. The scraper can now read full Jobs.af details.');
  } else {
    console.log('⚠ Timed out. Run this script again if the login did not finish.');
  }
  await context.close();
  process.exit(loggedIn ? 0 : 1);
}

void main();
