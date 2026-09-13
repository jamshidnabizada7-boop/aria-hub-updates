/**
 * curl fallback transport.
 *
 * o4af.com sits behind Cloudflare bot management which challenges the TLS
 * fingerprint of Node's undici / Bun's fetch (HTTP 403 "Just a moment…")
 * while allowing curl's OpenSSL ClientHello from the same IP. When native
 * fetch is blocked, scrapers can retry the URL through the local curl binary
 * (present in the sandbox and on typical servers; absent on Vercel
 * serverless, where native fetch usually works from Vercel's IPs anyway).
 *
 * Usage (see O4afScraper.fetchText):
 *   const body = await curlFetch(url, headers, timeoutMs);
 */

import { spawn } from 'node:child_process';

let curlAvailable: boolean | null = null;

/** Probe for a usable curl binary once per process. */
export function isCurlAvailable(): Promise<boolean> {
  if (curlAvailable !== null) return Promise.resolve(curlAvailable);
  return new Promise((resolve) => {
    try {
      const proc = spawn('curl', ['--version'], { stdio: 'ignore' });
      proc.on('error', () => {
        curlAvailable = false;
        resolve(false);
      });
      proc.on('exit', (code) => {
        curlAvailable = code === 0;
        resolve(curlAvailable);
      });
    } catch {
      curlAvailable = false;
      resolve(false);
    }
  });
}

/**
 * GET `url` via curl with the given headers, following redirects.
 * Resolves with the (decompressed) body; rejects on non-2xx or curl failure.
 */
export function curlFetch(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 20000,
): Promise<string> {
  const args = [
    '-s',
    '-L',
    '--compressed',
    '--max-time',
    String(Math.ceil(timeoutMs / 1000)),
    '-w',
    '\n__HTTP_STATUS__%{http_code}',
  ];
  for (const [key, value] of Object.entries(headers)) {
    args.push('-H', `${key}: ${value}`);
  }
  args.push(url);

  return new Promise((resolve, reject) => {
    let settled = false;
    let stdout = '';
    let stderr = '';
    try {
      const proc = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill('SIGKILL');
          reject(new Error(`curl timed out after ${timeoutMs}ms for ${url}`));
        }
      }, timeoutMs + 5000);

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      proc.on('error', (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`curl failed for ${url}: ${e.message}`));
      });
      proc.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // The trailing marker line carries the final status code.
        const markerIdx = stdout.lastIndexOf('\n__HTTP_STATUS__');
        const statusStr = markerIdx >= 0 ? stdout.slice(markerIdx + '\n__HTTP_STATUS__'.length).trim() : '';
        const body = markerIdx >= 0 ? stdout.slice(0, markerIdx) : stdout;
        const status = parseInt(statusStr, 10) || 0;

        if (code === 0 && status >= 200 && status < 300 && body.length > 0) {
          resolve(body);
        } else if (status === 304) {
          resolve(body);
        } else {
          reject(
            new Error(
              `curl fetch failed for ${url}: exit=${code} status=${status || 'n/a'}${
                stderr ? ` stderr=${stderr.trim().slice(0, 200)}` : ''
              }`,
            ),
          );
        }
      });
    } catch (e) {
      reject(new Error(`curl spawn failed for ${url}: ${e instanceof Error ? e.message : String(e)}`));
    }
  });
}
