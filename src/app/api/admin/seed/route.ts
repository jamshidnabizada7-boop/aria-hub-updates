import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getCurrentAdmin } from '@/lib/admin-auth';

export async function GET() {
  // Admin-only: this route provisions the super-admin account and site
  // defaults. Unauthenticated access would let anyone (re)create a known
  // super-admin — hard-gate it like every other admin API.
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs: string[] = [];
    logs.push('Started seeding...');

    // ── Languages ──────────────────────────────────────────────
    const langs = [
      { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', isDefault: false, order: 1, flag: '🇬🇧' },
      { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'rtl', isDefault: true, order: 0, flag: '🇦🇫' },
      { code: 'ps', name: 'Pashto', nativeName: 'پښتو', direction: 'rtl', isDefault: false, order: 2, flag: '🇦🇫' },
    ];
    for (const l of langs) {
      await db.language.upsert({ where: { code: l.code }, update: l, create: l });
    }
    logs.push('Languages seeded.');

    // ── Admin User ──────────────────────────────────────────────
    // Env-based bootstrap credentials — never hardcode a known password.
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    if (!email || !password || password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (min 8 chars) in the environment first.',
      }, { status: 400 });
    }
    const hash = await bcrypt.hash(password, 10);

    await db.adminUser.upsert({
      where: { email },
      update: {}, // Preserve custom password if user already exists
      create: {
        email,
        name: 'Super Admin',
        password: hash,
        role: 'super_admin',
      },
    });
    logs.push('Admin seeded.');

    // ── Site settings ──────────────────────────────────────────
    await db.siteSetting.upsert({
      where: { id: 'singleton' },
      update: {},
      create: {
        id: 'singleton',
        siteName: 'ARIA HUB',
      },
    });
    logs.push('Settings seeded.');

    // ── Tools Menu ──────────────────────────────────────────────
    const existingTools = await db.menuItem.findFirst({ where: { url: null, label: 'Tools' } });
    if (!existingTools) {
      const toolsMenu = await db.menuItem.create({
        data: {
          label: 'Tools',
          labelI18n: { en: 'Tools', fa: 'ابزارها', ps: 'وسیلې' },
          url: null,
          order: 99,
          visible: true,
          openInNewTab: false,
        }
      });
      
      await db.menuItem.create({
        data: {
          label: 'CV Builder',
          labelI18n: { en: 'CV Builder', fa: 'رزومه ساز', ps: 'سی وي جوړونکی' },
          url: '/cv-builder',
          parentId: toolsMenu.id,
          order: 1,
          visible: true,
        }
      });

      await db.menuItem.create({
        data: {
          label: 'Opportunity Matcher',
          labelI18n: { en: 'Opportunity Matcher', fa: 'فرصت یاب', ps: 'د فرصت موندونکی' },
          url: '/opportunity-matcher',
          parentId: toolsMenu.id,
          order: 2,
          visible: true,
        }
      });
      logs.push('Tools menu seeded.');
    } else {
      logs.push('Tools menu already exists.');
    }

    // ── Legal Footer Links ───────────────────────────────────────
    const legalLinks = [
      { label: 'Privacy Policy', labelI18n: { en: 'Privacy Policy', fa: 'حریم خصوصی', ps: 'د محرمیت تګلاره' }, url: '/privacy-policy', column: 'legal', order: 1 },
      { label: 'Terms of Service', labelI18n: { en: 'Terms of Service', fa: 'شرایط خدمات', ps: 'د خدماتو شرایط' }, url: '/terms-of-service', column: 'legal', order: 2 },
      { label: 'About Us', labelI18n: { en: 'About Us', fa: 'درباره ما', ps: 'زموږ په اړه' }, url: '/about', column: 'legal', order: 3 },
      { label: 'Contact Us', labelI18n: { en: 'Contact Us', fa: 'تماس با ما', ps: 'موږ سره اړیکه' }, url: '/contact', column: 'legal', order: 4 },
      { label: 'Blog', labelI18n: { en: 'Blog', fa: 'بلاگ', ps: 'بلاګ' }, url: '/blog', column: 'legal', order: 5 },
    ];
    let legalSeeded = 0;
    for (const link of legalLinks) {
      const existing = await db.footerLink.findFirst({ where: { url: link.url, column: link.column } });
      if (!existing) {
        await db.footerLink.create({ data: link });
        legalSeeded++;
      }
    }
    logs.push(`Legal footer links: ${legalSeeded} seeded, ${legalLinks.length - legalSeeded} already exist.`);

    // ── Static Pages ─────────────────────────────────────────────
    const pages = [
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        titleI18n: { en: 'Privacy Policy', fa: 'حریم خصوصی', ps: 'د محرمیت تګلاره' },
        content: '<h2>1. Introduction</h2><p>Welcome to ARIA HUB. We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and protect your information.</p><h2>2. Data We Collect</h2><p>We may collect your name, email address, and usage data when you interact with our services.</p><h2>3. Google AdSense &amp; Cookies</h2><p>We use Google AdSense to display ads. Third-party vendors may use cookies to serve ads based on prior visits. You may opt out via <a href="https://www.google.com/settings/ads" target="_blank">Google Ads Settings</a>.</p><h2>4. Data Security</h2><p>We use appropriate security measures to protect your personal data from unauthorized access or disclosure.</p><h2>5. Contact</h2><p>For privacy questions, please contact us at info@myariahub.com.</p>',
        contentI18n: { en: '', fa: '', ps: '' },
        status: 'published' as const,
      },
      {
        slug: 'terms-of-service',
        title: 'Terms of Service',
        titleI18n: { en: 'Terms of Service', fa: 'شرایط خدمات', ps: 'د خدماتو شرایط' },
        content: '<h2>1. Acceptance of Terms</h2><p>By using ARIA HUB, you agree to these terms. If you do not agree, please do not use our services.</p><h2>2. Description of Service</h2><p>ARIA HUB provides business consulting, visa services, and aggregation of global opportunities including jobs and scholarships. We strive for accuracy but do not guarantee the completeness of external listings.</p><h2>3. User Conduct</h2><p>You agree to use our services only for lawful purposes. You must not attempt to violate the security of our website or misuse any features.</p><h2>4. External Links</h2><p>Our website may contain links to third-party sites. We are not responsible for their content or practices.</p><h2>5. Modifications</h2><p>We reserve the right to modify these terms at any time. Continued use of our services constitutes acceptance of the updated terms.</p>',
        contentI18n: { en: '', fa: '', ps: '' },
        status: 'published' as const,
      },
      {
        slug: 'about',
        title: 'About ARIA HUB',
        titleI18n: { en: 'About ARIA HUB', fa: 'درباره آریا هاب', ps: 'د آریا هب په اړه' },
        content: '<h2>Our Mission</h2><p>At ARIA HUB, our mission is to empower individuals and businesses by connecting them with premium global opportunities. We believe that access to the right information and professional guidance is the key to international success.</p><h2>What We Do</h2><ul><li><strong>Opportunities &amp; Scholarships:</strong> We aggregate and analyze the best global opportunities to help students and professionals advance their careers.</li><li><strong>Visa Preparation:</strong> Expert guidance on navigating complex immigration and visa processes.</li><li><strong>Business Services:</strong> Comprehensive consulting for businesses looking to expand internationally.</li><li><strong>CV Builder &amp; Interview Prep:</strong> Tools to help you succeed in your applications.</li></ul><h2>Why Choose Us?</h2><p>Unlike standard aggregators, we provide deep insights, customized resources, and personalized consulting to ensure our users don\'t just find an opportunity — they successfully secure it. We serve the Afghan and Persian-speaking community with multilingual support in Dari, Pashto, and English.</p>',
        contentI18n: { en: '', fa: '', ps: '' },
        status: 'published' as const,
      },
    ];
    let pagesSeeded = 0;
    for (const p of pages) {
      const existing = await db.page.findUnique({ where: { slug: p.slug } });
      if (!existing) {
        await db.page.create({ data: p });
        pagesSeeded++;
      }
    }
    logs.push(`Static pages: ${pagesSeeded} seeded, ${pages.length - pagesSeeded} already exist.`);

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Seed failed' });
  }
}
