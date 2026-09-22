import { sendHtmlEmail, smtpConfigured } from '@/lib/mailer';

/**
 * Decision notification emails for opportunity submitters (community + employer).
 * Rendered in the language the submitter USED (submission.lang) so no new
 * i18n surface is needed. All sends are best-effort: they never throw and
 * never block the admin decision — SMTP-unconfigured = skipped with a log.
 */

const SITE = 'https://www.myariahub.com';

type Copy = {
  subjectApproved: string;
  subjectRejected: string;
  headingApproved: string;
  headingRejected: string;
  bodyApproved: string;
  bodyRejected: string;
  viewButton: string;
  refLabel: string;
  noteLabel: string;
  footer: string;
};

const COPY: Record<'en' | 'fa' | 'ps', Copy> = {
  en: {
    subjectApproved: 'Your submission is live on ARIA HUB 🎉',
    subjectRejected: 'Update on your ARIA HUB submission',
    headingApproved: 'Your opportunity is published!',
    headingRejected: 'We could not publish your submission',
    bodyApproved:
      'Thank you for contributing to ARIA HUB. Your submission passed our review and is now live — together with its full Farsi and Pashto versions, visible to thousands of job and scholarship seekers in Afghanistan.',
    bodyRejected:
      'Thank you for contributing to ARIA HUB. After review we could not publish this submission. You are always welcome to submit an improved version — complete details and a working application link give the best chances.',
    viewButton: 'View the published opportunity',
    refLabel: 'Reference code',
    noteLabel: 'Reviewer note',
    footer:
      'You received this email because you submitted an opportunity through myariahub.com. Submissions are reviewed within 24 hours.',
  },
  fa: {
    subjectApproved: 'ارسال شما در آریا هاب منتشر شد 🎉',
    subjectRejected: 'به‌روزرسانی درباره ارسال شما در آریا هاب',
    headingApproved: 'فرصت شما منتشر شد!',
    headingRejected: 'نتوانستیم ارسال شما را منتشر کنیم',
    bodyApproved:
      'از همکاری شما با آریا هاب سپاسگزاریم. ارسال شما بررسی شد و هم‌اکنون منتشر است — همراه با نسخه‌های کامل فارسی و پشتو، در معرض دید هزاران جوینده کار و بورسیه در افغانستان.',
    bodyRejected:
      'از همکاری شما با آریا هاب سپاسگزاریم. پس از بررسی نتوانستیم این ارسال را منتشر کنیم. همیشه می‌توانید نسخه بهبودیافته‌ای ثبت کنید — جزئیات کامل و لینک معتبر درخواست، شانس موفقیت را بیشتر می‌کند.',
    viewButton: 'مشاهده فرصت منتشرشده',
    refLabel: 'کد رهگیری',
    noteLabel: 'یادداشت بررسی‌کننده',
    footer:
      'این ایمیل را دریافت کرده‌اید چون از طریق myariahub.com فرصتی ثبت کرده‌اید. ارسال‌ها ظرف ۲۴ ساعت بررسی می‌شوند.',
  },
  ps: {
    subjectApproved: 'ستاسو لیږنه په آریا هب کې خپره شوه 🎉',
    subjectRejected: 'ستاسو د لیږنې په اړه تازه معلومات',
    headingApproved: 'ستاسو فرصت خپور شو!',
    headingRejected: 'ستاسو لیږنه خپاره نه شوه',
    bodyApproved:
      'له آریا هب سره د همکارۍ مننه. ستاسو لیږنه وبریدل شوه او اوس خپوره ده — د دري او پښتو بشپړو نسخو سره، د زرګونو افغان د کار او بورس غوښتونکو ته ښکارا.',
    bodyRejected:
      'له آریا هب سره د همکارۍ مننه. له بیاکتنې وروسته مو دا لیږنه خپرول نه شول. تل کولی شئ د يوې ښه شوي نسخې په ثبتولو سره بیا هڅه وکړئ — بشپړ تفصیل او سمه د غوښتنې لینک بریالیتوب زیاتوي.',
    viewButton: 'خپور شوی فرصت وګورئ',
    refLabel: 'تعقیب کوډ',
    noteLabel: 'د بیاکتنې یادونه',
    footer:
      'دا برېښنالیک مو ځکه ترلاسه کړ چې له myariahub.com څخه مو فرصت ثبت کړی دی. لیږنې په ۲۴ ساعتو کې بریکتل کیږي.',
  },
};

function wrapEmail(lang: 'en' | 'fa' | 'ps', inner: string): string {
  const rtl = lang !== 'en';
  return `<!doctype html>
<html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f8fafc;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <p style="text-align:center;font-weight:900;font-size:18px;color:#2563eb;margin:0 0 18px;">ARIA <span style="color:#0f172a;">HUB</span></p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:26px;">
      ${inner}
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;line-height:1.7;">${COPY[lang].footer}</p>
  </div>
</body></html>`;
}

/**
 * Send the decision email. Never throws. Returns 'sent' | 'skipped' | 'failed'.
 */
export async function sendDecisionEmail(opts: {
  to: string;
  lang: string;
  approved: boolean;
  referenceCode: string;
  title: string;
  publishedSlug?: string | null;
  reviewNote?: string | null;
}): Promise<'sent' | 'skipped' | 'failed'> {
  if (!smtpConfigured()) return 'skipped';
  const lang: 'en' | 'fa' | 'ps' = opts.lang === 'fa' ? 'fa' : opts.lang === 'ps' ? 'ps' : 'en';
  const c = COPY[lang];
  const rtl = lang !== 'en';
  const align = rtl ? 'right' : 'left';

  try {
    if (opts.approved && opts.publishedSlug) {
      const url = `${SITE}/${lang}/opportunities/${opts.publishedSlug}`;
      const inner = `
        <h1 style="font-size:18px;color:#0f172a;margin:0 0 10px;text-align:${align};">${c.headingApproved}</h1>
        <p style="color:#334155;font-size:14px;line-height:1.8;margin:0 0 16px;text-align:${align};">${c.bodyApproved}</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;margin:0 0 18px;">
          <p style="color:#0f172a;font-size:14px;font-weight:700;margin:0;text-align:${align};">${opts.title}</p>
          <p style="color:#64748b;font-size:11px;margin:6px 0 0;text-align:${align};">${c.refLabel}: <span style="font-family:monospace;font-weight:700;letter-spacing:1px;" dir="ltr">${opts.referenceCode}</span></p>
        </div>
        <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:10px;text-align:center;">${c.viewButton}</a>`;
      await sendHtmlEmail({ to: opts.to, subject: c.subjectApproved, html: wrapEmail(lang, inner) });
      return 'sent';
    }

    if (!opts.approved) {
      const noteHtml = opts.reviewNote
        ? `<div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:12px 16px;margin:0 0 18px;">
             <p style="color:#9f1239;font-size:11px;font-weight:700;margin:0 0 4px;text-align:${align};">${c.noteLabel}</p>
             <p style="color:#334155;font-size:13px;line-height:1.7;margin:0;text-align:${align};">${opts.reviewNote.replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch] || ch))}</p>
           </div>`
        : '';
      const inner = `
        <h1 style="font-size:18px;color:#0f172a;margin:0 0 10px;text-align:${align};">${c.headingRejected}</h1>
        <p style="color:#334155;font-size:14px;line-height:1.8;margin:0 0 16px;text-align:${align};">${c.bodyRejected}</p>
        ${noteHtml}
        <p style="color:#64748b;font-size:11px;margin:0;text-align:${align};">${c.refLabel}: <span style="font-family:monospace;font-weight:700;letter-spacing:1px;" dir="ltr">${opts.referenceCode}</span></p>`;
      await sendHtmlEmail({ to: opts.to, subject: c.subjectRejected, html: wrapEmail(lang, inner) });
      return 'sent';
    }

    return 'skipped';
  } catch (e) {
    console.error('[submission-notify] send failed:', e);
    return 'failed';
  }
}
