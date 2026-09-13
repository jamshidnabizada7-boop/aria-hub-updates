import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentAdmin, logAction } from '@/lib/admin-auth';

const ALLOWED = [
  'siteName', 'siteNameI18n', 'tagline', 'taglineI18n', 'description', 'descriptionI18n', 'email', 'phone', 'address', 'addressI18n',
  'currency', 'timezone', 'dateFormat', 'primaryColor', 'secondaryColor',
  'accentColor', 'fontFamily', 'socialPosition', 'socialHideOnScroll',
  'maintenanceMode', 'gaId', 'fbPixelId', 'logoUrl', 'logoDarkUrl', 'faviconUrl',
  'appleIconUrl', 'mapEmbed',
] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const settings = await db.siteSetting.findFirst();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let data: any;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const clean: any = {};
  for (const f of ALLOWED) {
    if (data[f] === undefined) continue;
    // Type coercion + light validation
    if (f === 'maintenanceMode' || f === 'socialHideOnScroll') {
      clean[f] = Boolean(data[f]);
    } else if (f === 'socialPosition') {
      clean[f] = data[f] === 'right' ? 'right' : 'left';
    } else if (f === 'primaryColor' || f === 'secondaryColor' || f === 'accentColor') {
      const v = String(data[f]);
      if (!HEX_RE.test(v)) {
        return NextResponse.json({ error: `${f} must be a valid hex color (e.g. #0A66C2).` }, { status: 400 });
      }
      clean[f] = v;
    } else {
      clean[f] = typeof data[f] === 'string' ? data[f].slice(0, 2000) : data[f];
    }
  }

  try {
    // Atomic upsert avoids the read-then-write race condition.
    const settings = await db.siteSetting.upsert({
      where: { id: 'singleton' },
      update: clean,
      create: { id: 'singleton', ...clean },
    });
    await logAction({ userId: admin.id, action: 'update', entity: 'siteSetting', entityId: 'singleton', req });
    
    // Invalidate site cache so frontend reflects new settings immediately
    const { revalidatePath } = require('next/cache');
    revalidatePath('/', 'layout');
    
    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    console.error('[settings] error:', e);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
