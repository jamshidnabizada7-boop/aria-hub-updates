import { expect, test } from 'bun:test';
import { buildDetailSummary, buildSourceSummary, summaryPlainText } from '../src/lib/opportunity-summary';

test('the reported Dari cut-off is replaced by complete source and requirements', () => {
  const intro = 'انجام مسلکی فعالیت‌های دیزاین و تحلیل سیستم‌های میخانیکی ساختمان، تهیه محاسبات، نقشه‌ها و جزئیات تخنیکی و ارائه راه‌حل‌های مؤثر، مصون و اقتصادی مطابق معیارها و نیازمندی‌های پروژه تعمیراتی.';
  const blocks = buildDetailSummary({
    summary: 'هدف وظیفه انجام مسلکی فعالیت‌های دیزاین و تحلیل سیستم‌های میخانیکی ساختمان، تهیه محاسبات، نقشه‌ها و جزئیات تخنیکی و ارائه راه‌حل‌های مؤثر، مصون و اقتصاد...',
    description: `<h4>هدف وظیفه</h4><p>${intro}</p>`,
    requirements: '<p>حداقل مدرک لیسانس در رشته انجنیری میخانیک الزامی است. داشتن پنج سال تجربه مرتبط و تسلط کامل به AutoCAD لازم است.</p>',
    guidelines: '<p>درخواست را از طریق لینک رسمی ارسال کنید.</p>',
  });
  expect(blocks[0].text).toBe(intro);
  expect(blocks.some(b => b.text.includes('لیسانس'))).toBe(true);
  expect(blocks.some(b => b.text.includes('درخواست'))).toBe(true);
  expect(blocks.every(b => !/(?:\.{3}|…)\s*$/.test(b.text))).toBe(true);
});

test('a complete authored summary longer than 800 characters is shown in full', () => {
  const summary = Array.from({ length: 15 }, (_, i) => `This research opportunity includes a complete meaningful sentence numbered ${i} with essential information for interested applicants.`).join(' ');
  expect(summary.length).toBeGreaterThan(800);
  expect(buildDetailSummary({ summary, description: 'Different details.' })).toEqual([{ text: summary }]);
});

test('fallback uses whole sentences and preserves decimal numbers, URLs and emails', () => {
  const long = Array.from({ length: 8 }, (_, i) => `Research sentence ${i} describes the application and programme in sufficient detail to inform potential applicants.`).join(' ');
  const text = buildSourceSummary({ description: 'Salary is 1.5 million. Contact hr@example.org and apply at https://example.org/jobs. '+long });
  expect(text).toContain('1.5 million.');
  expect(text).toContain('hr@example.org');
  expect(text).toContain('https://example.org/jobs.');
  expect(text).toMatch(/applicants\.$/);
  expect(text).not.toContain('…');
});

test('sparse sources are not padded or invented', () => {
  expect(buildSourceSummary({ description: 'Support community health visits.' })).toBe('Support community health visits.');
  expect(buildDetailSummary({ summary: 'Short complete description.', description: 'Short complete description.' })).toEqual([{ text: 'Short complete description.' }]);
});

test('a short overview is expanded when qualifications and benefits are available', () => {
  const blocks = buildDetailSummary({ summary: 'A fellowship for researchers.', description: 'A fellowship for researchers.', requirements: 'Applicants must hold a postgraduate degree and have relevant research experience. They must provide a complete research proposal, references, transcripts and proof of English proficiency with their application.', benefits: 'Funding covers tuition, travel, accommodation and a monthly living allowance.' });
  expect(blocks.map(b => b.labelKey)).toContain('opportunities.requirements');
  expect(blocks.map(b => b.labelKey)).toContain('opportunities.benefits');
});

test('HTML is plain readable text and duplicate sections are omitted', () => {
  expect(summaryPlainText('<script>ignore me</script><p>Research &amp; training.</p><p>Second paragraph.</p>')).toBe('Research & training.\nSecond paragraph.');
  const blocks = buildDetailSummary({ description: 'Complete overview.', requirements: 'Complete overview.' });
  expect(blocks).toHaveLength(1);
});

test('long Pashto source text ends at a complete sentence', () => {
  const sentence = 'غوښتونکي باید خپل اسناد او بشپړ غوښتنلیک د ټاکلې نېټې تر مخه وسپاري۔';
  const blocks = buildDetailSummary({ summary: 'غوښتونکي باید خپل اسناد…', description: Array(10).fill(sentence).join(' ') });
  expect(blocks[0].text).toMatch(/وسپاري۔$/);
  expect(blocks[0].text).not.toContain('…');
});
