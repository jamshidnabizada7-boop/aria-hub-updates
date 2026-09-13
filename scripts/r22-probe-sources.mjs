#!/usr/bin/env node
/**
 * R22 source probe — test candidate new scrape sources live.
 * For each candidate: WP REST endpoint, RSS feed, or custom JSON API.
 * Prints OK/FAIL with quick stats so we only seed working sources.
 */
const candidates = [
  // WordPress scholarship/opportunity aggregators (wpApi → zero code)
  { name: 'AfterSchoolAfrica', kind: 'wp', url: 'https://www.afterschoolafrica.com/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'ScholarshipPositions', kind: 'wp', url: 'https://scholarshippositions.com/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'Youth Opportunities', kind: 'wp', url: 'https://www.youthop.com/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'OpportunitiesForYouth', kind: 'wp', url: 'https://opportunitiesforyouth.org/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'ScholarshipsCorner', kind: 'wp', url: 'https://scholarshipscorner.website/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'Wadsam', kind: 'wp', url: 'https://www.wadsam.com/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'Untalent', kind: 'wp', url: 'https://untalent.org/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'Uncareer', kind: 'wp', url: 'https://uncareer.net/wp-json/wp/v2/posts?per_page=5&_embed=1' },
  { name: 'OpportunityDesk-Check', kind: 'wp', url: 'https://opportunitydesk.org/wp-json/wp/v2/posts?per_page=2&_embed=1' },
  // Afghan news RSS (rssNews → zero code)
  { name: 'Khaama Press', kind: 'rss', url: 'https://www.khaama.com/feed/' },
  { name: 'Pajhwok', kind: 'rss', url: 'https://pajhwok.com/rss.xml' },
  { name: 'Bakhtar News', kind: 'rss', url: 'https://www.bakhtarnews.af/en/feed/' },
  { name: 'Hasht-e-Subh EN', kind: 'rss', url: 'https://en.hasht-e-subh.daily/feed/' },
  { name: 'Etilaat Roz', kind: 'rss', url: 'https://etilaatroz.com/feed/' },
  // Misc JSON
  { name: 'ReliefWeb-check', kind: 'json', url: 'https://api.reliefweb.int/v2/jobs?appname=ariahub-probe&limit=1&profile=list' },
  // ACBAR reachability (custom HTML scraper exists)
  { name: 'ACBAR-check', kind: 'html', url: 'https://www.acbar.org/opportunities' },
  { name: 'o4af-check', kind: 'html', url: 'https://o4af.com/opportunity/' },
];

const hdr = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: '*/*',
};

for (const cand of candidates) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const res = await fetch(cand.url, { headers: hdr, signal: ctl.signal });
    const body = await res.text();
    let note = '';
    if (cand.kind === 'wp') {
      try {
        const arr = JSON.parse(body);
        note = Array.isArray(arr) ? `${arr.length} posts; first title: ${String(arr[0]?.title?.rendered || '').replace(/<[^>]*>/g, '').slice(0, 60)}` : 'not array';
      } catch { note = body.startsWith('<') ? 'HTML (challenge?)' : 'non-JSON'; }
    } else if (cand.kind === 'rss') {
      const items = (body.match(/<item[\s>]/g) || []).length + (body.match(/<entry[\s>]/g) || []).length;
      note = body.includes('<item') || body.includes('<entry') ? `RSS ok, ${items} items` : 'no items tag';
    } else if (cand.kind === 'json') {
      note = res.ok ? `JSON ok (${body.length}b)` : `HTTP ${res.status}`;
    } else {
      note = res.ok ? `HTML ${body.length}b` : `HTTP ${res.status}`;
      if (body.includes('One moment') || body.includes('Just a moment')) note += ' CLOUDFLARE';
    }
    console.log(`${res.ok ? '✓' : '✗'} ${cand.name} [${res.status}] ${note}`);
  } catch (e) {
    console.log(`✗ ${cand.name} ERR ${String(e.message || e).slice(0, 80)}`);
  } finally {
    clearTimeout(t);
  }
}
