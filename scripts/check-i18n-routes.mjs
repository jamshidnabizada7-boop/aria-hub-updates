// Fetch each [lang] route in fa & ps (sequential, with retry), compute Arabic-script ratio
const routes = ['', 'about', 'advertise', 'blog', 'contact', 'cv-builder', 'deadlines', 'employers',
  'interview-prep', 'opportunities', 'opportunity-matcher', 'privacy-policy', 'services',
  'submit-opportunity', 'success-stories', 'templates', 'terms-of-service', 'track', 'visa-prep', 'visas'];

function ratioOf(text) {
  const arabic = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const total = arabic + latin;
  return total ? arabic / total : -1;
}

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
}

async function fetchRetry(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      return { res, body: await res.text() };
    } catch (e) {
      if (i === tries) throw e;
      await new Promise(r => setTimeout(r, 8000));
    }
  }
}

for (const lang of ['fa', 'ps']) {
  for (const r of routes) {
    const url = `http://localhost:3000/${lang}${r ? '/' + r : ''}`;
    const label = `/${lang}/${r || ''}`;
    try {
      const { res, body } = await fetchRetry(url);
      const ratio = ratioOf(extractText(body));
      const flag = res.status === 200 && ratio >= 0 && ratio < 0.5 ? '  ⚠️ LOW' : '';
      console.log(`${label.padEnd(26)} ${res.status}  ar-script ${(ratio * 100).toFixed(0)}%${flag}`);
    } catch (e) {
      console.log(`${label.padEnd(26)} ERROR ${e.message}`);
    }
  }
}
