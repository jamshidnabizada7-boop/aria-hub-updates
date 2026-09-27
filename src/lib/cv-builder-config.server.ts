import 'server-only';
import { db } from '@/lib/db';
import {
  CV_BUILDER_SECTION_KEY,
  DEFAULT_CV_BUILDER_ADMIN_CONFIG,
  normalizeCVBuilderAdminConfig,
  type CVBuilderAdminConfig,
} from '@/app/[lang]/cv-builder/lib/cv-admin-config';

export async function getCVBuilderConfig(): Promise<CVBuilderAdminConfig> {
  try {
    const row = await db.section.findUnique({
      where: { key: CV_BUILDER_SECTION_KEY },
      select: { enabled: true, title: true, subtitle: true, config: true },
    });

    if (!row) return normalizeCVBuilderAdminConfig(DEFAULT_CV_BUILDER_ADMIN_CONFIG);

    let stored: unknown = {};
    if (row.config) {
      try { stored = JSON.parse(row.config); } catch { stored = {}; }
    }

    const normalized = normalizeCVBuilderAdminConfig({
      ...record(stored),
      enabled: row.enabled,
    });

    return {
      ...normalized,
      intro: {
        ...normalized.intro,
        en: {
          title: row.title?.trim() || normalized.intro.en.title,
          description: row.subtitle?.trim() || normalized.intro.en.description,
        },
      },
    };
  } catch (error) {
    console.error('[cv-builder-config] failed to load admin config:', error);
    return normalizeCVBuilderAdminConfig(DEFAULT_CV_BUILDER_ADMIN_CONFIG);
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
