#!/usr/bin/env node
/**
 * R24 — seed SocialIdea rows (Brand Studio editorial copy).
 * Trilingual (en/fa/ps) tips, quotes and platform promos that the code-driven
 * social templates and the daily planner rotate through. Idempotent: upsert by
 * (kind + canonical text hash via unique-ish lookup).
 *
 * Run: node scripts/r24-seed-social-ideas.mjs
 */
import { Client } from 'pg';

const LOCAL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const c = new Client({ connectionString: process.env.R24_DB_URL || LOCAL });
await c.connect();

const IDEAS = [
  // ─── TIPS (career / application advice series) ───
  {
    kind: 'tip',
    text: 'Tailor your CV to every job — recruiters decide in under 30 seconds.',
    textI18n: {
      en: 'Tailor your CV to every job — recruiters decide in under 30 seconds.',
      fa: 'سی‌وی خود را برای هر وظیفه تنظیم کنید — کارفرمایان در کمتر از ۳۰ ثانیه تصمیم می‌گیرند.',
      ps: 'خپل سی‌وی د هر کار لپاره برابر کړه — استخداموونکي په ۳۰ ثانیو کې پرېکړه کوي.',
    },
  },
  {
    kind: 'tip',
    text: 'Apply in the first 72 hours — early applicants get far more interviews.',
    textI18n: {
      en: 'Apply in the first 72 hours — early applicants get far more interviews.',
      fa: 'در ۷۲ ساعت اول درخواست بدهید — درخواست‌کنندگان زودتر مصاحبه‌های بیشتر می‌گیرند.',
      ps: 'په لومړیو ۷۲ ساعتو کې غوښتنه وکړه — مخکینی غوښتونکي ډېرې مرکې ترلاسه کوي.',
    },
  },
  {
    kind: 'tip',
    text: 'A short, honest motivation letter beats a long generic one every time.',
    textI18n: {
      en: 'A short, honest motivation letter beats a long generic one every time.',
      fa: 'یک انگیزش‌نامهٔ کوتاه و صادقانه همیشه از یک نامهٔ بلند و کلی بهتر است.',
      ps: 'یو لنډ او ریښتینی انگیزش لیکتنه هر وخت له اوږدې او عمومي لیکنې غوره ده.',
    },
  },
  {
    kind: 'tip',
    text: 'Check the deadline twice — an incomplete file is an automatic rejection.',
    textI18n: {
      en: 'Check the deadline twice — an incomplete file is an automatic rejection.',
      fa: 'ددلاین را دو بار بررسی کنید — فایل ناقص یعنی رد شدن خودکار.',
      ps: 'وروستۍ نېټه دوه ځله وګوره — نیمګړی فسایل سمدلاسه ردېدو مانا لري.',
    },
  },
  {
    kind: 'tip',
    text: 'Prepare one strong story about your achievements — use it in every interview.',
    textI18n: {
      en: 'Prepare one strong story about your achievements — use it in every interview.',
      fa: 'یک داستان قوی از دستاوردهای خود آماده کنید — در هر مصاحبه از آن استفاده کنید.',
      ps: 'د خپلو لاسته راوړنو یو پیاوړی کیسه چمتو کړه — په هره مرکه کې یې وکاروه.',
    },
  },
  {
    kind: 'tip',
    text: 'Keep scanned copies of your documents ready — opportunities appear without warning.',
    textI18n: {
      en: 'Keep scanned copies of your documents ready — opportunities appear without warning.',
      fa: 'اسکن اسناد خود را آماده نگه دارید — فرصت‌ها بی‌هشدار ظاهر می‌شوند.',
      ps: 'د خپلو اسنادو سکن کاپۍ چمتو وساته — فرصتونه بې له خبرداري راځي.',
    },
  },
  {
    kind: 'tip',
    text: 'Learn the exact university and program name before your scholarship interview.',
    textI18n: {
      en: 'Learn the exact university and program name before your scholarship interview.',
      fa: 'پیش از مصاحبهٔ بورسیه، نام دقیق پوهنتون و رشته را یاد بگیرید.',
      ps: 'له بورس مرکې دمخه د پوهنتون او پروګرام دقیق نوم زده کړه.',
    },
  },
  {
    kind: 'tip',
    text: 'Free online courses with certificates keep your profile growing between jobs.',
    textI18n: {
      en: 'Free online courses with certificates keep your profile growing between jobs.',
      fa: 'کورس‌های آنلاین رایگان با سند، پروفایل شما را میان دو وظیفه رشد می‌دهند.',
      ps: 'په سند سره وړیا آنلاین کورسونه ستا پروفایل د کارونو ترمنځ وده ورکوي.',
    },
  },

  // ─── QUOTES (motivation series) ───
  {
    kind: 'quote',
    text: 'Every big future starts with one small application.',
    textI18n: {
      en: 'Every big future starts with one small application.',
      fa: 'هر آیندهٔ بزرگ با یک درخواست کوچک آغاز می‌شود.',
      ps: 'هر لوی راتلونکی له یوې کوچنۍ غوښتنې پیل کیږي.',
    },
  },
  {
    kind: 'quote',
    text: 'Education is the passport to the world.',
    textI18n: {
      en: 'Education is the passport to the world.',
      fa: 'تحصیل، پاسپورت دنیاست.',
      ps: 'زده کړه د نړۍ پاسپورت دی.',
    },
  },
  {
    kind: 'quote',
    text: 'The distance between you and your dream is one deadline. Meet it.',
    textI18n: {
      en: 'The distance between you and your dream is one deadline. Meet it.',
      fa: 'فاصلهٔ شما و رویایتان، یک ددلاین است. از آن پیشی بگیرید.',
      ps: 'ستا او ارمان دې ترمنځ یوازې یوه وروستۍ نېټه ده. ورته ورسېږه.',
    },
  },
  {
    kind: 'quote',
    text: 'Study today so the world opens its doors tomorrow.',
    textI18n: {
      en: 'Study today so the world opens its doors tomorrow.',
      fa: 'امروز درس بخوانید تا فردا دنیا درهایش را باز کند.',
      ps: 'نن لوسته وکړه چې سبا نړۍ دروازې دې خلاصې کړي.',
    },
  },
  {
    kind: 'quote',
    text: 'A document prepared today is an interview won tomorrow.',
    textI18n: {
      en: 'A document prepared today is an interview won tomorrow.',
      fa: 'سندی که امروز آماده کنید، فردا یک مصاحبه را می‌برد.',
      ps: 'اسناد چې نن چمتو کړې، سبا مره ګټلې ده.',
    },
  },
  {
    kind: 'quote',
    text: 'Your opportunity is not far — it is one search away.',
    textI18n: {
      en: 'Your opportunity is not far — it is one search away.',
      fa: 'فرصت شما دور نیست — فقط یک جست‌وجو فاصله دارد.',
      ps: 'ستا فرصت لرې نه دي — یوازې یو لټون لرې دي.',
    },
  },

  // ─── PROMOS (platform feature series) ───
  {
    kind: 'promo',
    text: 'Jobs, scholarships and visa guides — checked, trilingual and free on ARIA HUB.',
    textI18n: {
      en: 'Jobs, scholarships and visa guides — checked, trilingual and free on ARIA HUB.',
      fa: 'وظایف، بورسیه‌ها و راهنمای ویزه — بررسی‌شده، سه‌زبانه و رایگان در آریا هاب.',
      ps: 'کارونه، بورسونه او د ویزې لارښود — نه ړندې شوي، درې ژبي او وړیا په آریا هاب کې.',
    },
  },
  {
    kind: 'promo',
    text: 'New opportunities are added every single day. Never miss a deadline again.',
    textI18n: {
      en: 'New opportunities are added every single day. Never miss a deadline again.',
      fa: 'هر روز فرصت‌های تازه اضافه می‌شود. دیگر هیچ ددلاینی را از دست ندهید.',
      ps: 'هره ورځ نوي فرصتونه اضافه کیږي. بیا کومه وروستۍ نېټه له لاسه مه ورکوه.',
    },
  },
  {
    kind: 'promo',
    text: 'From Kabul to the world — find your future in your own language.',
    textI18n: {
      en: 'From Kabul to the world — find your future in your own language.',
      fa: 'از کابل تا دنیا — آیندهٔ خود را به زبان خودتان پیدا کنید.',
      ps: 'له کابل څخه تر نړۍ پورې — خپل راتلونکی په خپله ژبه پېدا کړه.',
    },
  },
];

let inserted = 0;
for (let i = 0; i < IDEAS.length; i++) {
  const idea = IDEAS[i];
  const exists = await c.query('SELECT id FROM "SocialIdea" WHERE kind=$1 AND text=$2 LIMIT 1', [idea.kind, idea.text]);
  if (exists.rowCount > 0) continue;
  await c.query(
    'INSERT INTO "SocialIdea" (id, kind, text, "textI18n", note, "noteI18n", active, "sortOrder", "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, true, $6, now(), now())',
    [idea.kind, idea.text, JSON.stringify(idea.textI18n), idea.note || null, idea.note ? JSON.stringify(idea.noteI18n || null) : null, i],
  );
  inserted++;
}
console.log(`[r24] SocialIdea seeded: +${inserted} (total: ${(await c.query('SELECT count(*)::int n FROM "SocialIdea"')).rows[0].n})`);
await c.end();
