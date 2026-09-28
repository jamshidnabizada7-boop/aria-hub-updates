import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getCurrentAdmin, logAction, rateLimit } from '@/lib/admin-auth';
import { getCVBuilderConfig } from '@/lib/cv-builder-config.server';
import {
  CV_BUILDER_SECTION_KEY,
  normalizeCVBuilderAdminConfig,
} from '@/app/[lang]/cv-builder/lib/cv-admin-config';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = await getCVBuilderConfig();
  return NextResponse.json({
    config,
    storage: { model: 'Section', key: CV_BUILDER_SECTION_KEY },
  });
}

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`admin:cv-builder:${admin.id}`, 30)) {
    return NextResponse.json({ error: 'Too many updates. Please wait a minute.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const source = body && typeof body === 'object' && 'config' in body
    ? (body as { config: unknown }).config
    : body;
  const config = normalizeCVBuilderAdminConfig(source);

  try {
    await db.section.upsert({
      where: { key: CV_BUILDER_SECTION_KEY },
      update: {
        title: config.intro.en.title,
        subtitle: config.intro.en.description,
        enabled: config.enabled,
        config: JSON.stringify(config),
      },
      create: {
        key: CV_BUILDER_SECTION_KEY,
        title: config.intro.en.title,
        subtitle: config.intro.en.description,
        enabled: config.enabled,
        order: 900,
        config: JSON.stringify(config),
      },
    });

    await logAction({
      userId: admin.id,
      action: 'update',
      entity: 'cvBuilderConfig',
      entityId: CV_BUILDER_SECTION_KEY,
      details: JSON.stringify({
        enabled: config.enabled,
        defaultPurpose: config.defaultPurpose,
        enabledTemplates: Object.entries(config.templates).filter(([, value]) => value.enabled).map(([key]) => key),
      }),
      req,
    });

    for (const lang of ['en', 'fa', 'ps']) revalidatePath(`/${lang}/cv-builder`);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[admin/cv-builder] save failed:', error);
    return NextResponse.json({ error: 'Failed to save CV Builder settings.' }, { status: 500 });
  }
}
