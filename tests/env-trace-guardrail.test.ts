/**
 * PHASE 4 guardrail — no deployable runtime module may manually read `.env`
 * files. Runtime configuration comes exclusively from process.env (Next.js
 * loads env files at build/boot; hand-rolling file reads puts secrets like
 * API keys into deployed function bundles).
 */
import { describe, test, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const FORBIDDEN = [
  /readFileSync\s*\([^)]*['"`]\.env/,
  /readFile(?:Sync)?\s*\([^)]*['"`][^'"`]*\.env/,
  /from\s+['"]dotenv['"]/,
  /require\(\s*['"]dotenv['"]\s*\)/,
  /dotenv\.config\s*\(/,
];

function collect(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
      collect(p, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

describe('PHASE 4 guardrail — no runtime .env file reads', () => {
  test('src/app and src/lib contain no manual .env loading', () => {
    const offenders: string[] = [];
    for (const scope of ['src/app', 'src/lib']) {
      for (const file of collect(path.join(root, scope))) {
        const content = readFileSync(file, 'utf8');
        for (const pattern of FORBIDDEN) {
          if (pattern.test(content)) offenders.push(`${file} :: ${pattern}`);
        }
      }
    }
    expect(offenders, `runtime .env readers found:\n${offenders.join('\n')}`).toEqual([]);
  });
});
