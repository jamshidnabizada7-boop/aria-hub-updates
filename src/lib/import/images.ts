/**
 * Image download + optimization for imported opportunities.
 *
 * Downloads a remote image, optimizes it with sharp (resize + webp), and
 * uploads it to Vercel Blob storage.
 * Returns the Vercel Blob URL so it works exactly like the existing
 * image URL fields.
 *
 * On a failed or unsafe download, returns a placeholder path. Without Blob
 * storage, a successfully fetched public URL remains the image source.
 */

import sharp from 'sharp';
import { slugify } from './utils';
import { put } from '@vercel/blob';
import { fetchPublicImage, isPublicImageUrlSyntax } from './public-image-url';

const PLACEHOLDER = '/images/placeholder-opportunity.png';

/** True when Vercel Blob is configured; without a token we skip uploads. */
function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN);
}

/** Size presets (max width; height auto-scaled to preserve aspect ratio). */
const SIZES = {
  featured: 1600,
  logo: 400,
} as const;

export interface ImageResult {
  /** Web-root-relative path or Blob URL or remote fallback URL. */
  path: string;
  /** True if the image was downloaded locally/to blob, false if remote fallback. */
  local: boolean;
}

/**
 * Download and optimize a featured image (max 1600px wide, webp).
 */
export async function downloadFeaturedImage(
  url: string | null | undefined,
  sourceKey: string,
  slug: string,
): Promise<ImageResult> {
  return downloadAndOptimize(url, sourceKey, slug, 'featured');
}

/**
 * Download and optimize a logo (max 400px wide, webp).
 */
export async function downloadLogo(
  url: string | null | undefined,
  sourceKey: string,
  slug: string,
): Promise<ImageResult> {
  return downloadAndOptimize(url, sourceKey, slug, 'logo');
}

/**
 * Core download + optimize logic. 
 */
async function downloadAndOptimize(
  url: string | null | undefined,
  sourceKey: string,
  slug: string,
  kind: keyof typeof SIZES | 'featured' | 'logo',
): Promise<ImageResult> {
  if (!url || !url.trim()) {
    return { path: kind === 'logo' ? '' : PLACEHOLDER, local: false };
  }

  const trimmedUrl = url.trim();
  if (!isPublicImageUrlSyntax(trimmedUrl)) {
    return { path: kind === 'logo' ? '' : PLACEHOLDER, local: false };
  }
  const cleanSlug = slugify(slug) || 'image';
  const subdir = kind === 'logo' ? 'logos' : 'featured';
  const filename = `${sourceKey}/${subdir}/${cleanSlug}-${Date.now()}.webp`;

  try {
    // Download
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    try {
      res = await fetchPublicImage(trimmedUrl, controller.signal);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Cap the download: a multi-hundred-MB body used to be fully buffered
    // before sharp ever saw it. Content-Length is authoritative when present;
    // otherwise the streamed read stops at the cap.
    const MAX_BYTES = 12 * 1024 * 1024; // 12 MB — generous for any real image
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new Error(`image too large (${(declared / 1048576).toFixed(1)} MB)`);
    let buffer: Buffer;
    if (res.body) {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel().catch(() => undefined);
          throw new Error(`image exceeded ${MAX_BYTES / 1048576} MB while downloading`);
        }
        chunks.push(value);
      }
      buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    } else {
      buffer = Buffer.from(await res.arrayBuffer());
    }
    if (buffer.length < 100) throw new Error('image too small (possibly an error page)');

    // Optimize with sharp
    const maxWidth = SIZES[kind as 'featured' | 'logo'] || SIZES.featured;
    const processedBuffer = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // Upload to Vercel Blob (only when credentials exist — e.g. not in sandboxes)
    if (!blobConfigured()) {
      // No blob token: keep the original remote URL (image is still usable)
      return { path: trimmedUrl, local: false };
    }
    const blob = await put(filename, processedBuffer, {
      access: 'public',
      contentType: 'image/webp',
    });

    return { path: blob.url, local: true };
  } catch (e) {
    console.error('[images] download failed:', e instanceof Error ? e.message : String(e));
    return { path: kind === 'logo' ? '' : PLACEHOLDER, local: false };
  }
}
