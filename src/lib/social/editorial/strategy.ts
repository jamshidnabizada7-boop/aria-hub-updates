/**
 * Brand Studio 2.0 — human-reviewed editorial foundations.
 *
 * This is deliberately provider-free. It makes no engagement predictions, does not
 * translate copy automatically, and has no side effects or access to social APIs.
 */
import type { Lang } from '@/lib/lang-route';
import type { PostTemplate } from '@/lib/social/brand';
import type { DesignFamilyId } from '@/lib/social/studio/types';

export type EditorialPillarId =
  | 'career-skills' | 'scholarship-help' | 'interview' | 'language-learning'
  | 'student-life' | 'productivity' | 'free-resources' | 'ai-tools'
  | 'tech-explainers' | 'community-question' | 'student-humor' | 'real-stories'
  | 'myth-fact' | 'quiz' | 'cultural' | 'aria-features'
  | 'opportunity-roundup' | 'deadline-alert' | 'verified-news' | 'inspiration';

export type EditorialPillar = {
  id: EditorialPillarId;
  label: Record<Lang, string>;
  purpose: string;
  requiresSource?: boolean;
  requiresConsent?: boolean;
  suggestedTemplate: PostTemplate;
};

const labels = (en: string, fa: string, ps: string): Record<Lang, string> => ({ en, fa, ps });

export const EDITORIAL_PILLARS: EditorialPillar[] = [
  { id: 'career-skills', label: labels('CV and career skills', 'مهارت‌های کاری و ساخت CV', 'د کار او سي وي مهارتونه'), purpose: 'Practical, save-worthy career guidance', suggestedTemplate: 'tip' },
  { id: 'scholarship-help', label: labels('Scholarship application advice', 'راهنمای درخواست بورسیه', 'د بورسونو غوښتنلیک لارښوونې'), purpose: 'Verified explanations of application processes', suggestedTemplate: 'tip' },
  { id: 'interview', label: labels('Interview preparation', 'آمادگی مصاحبه', 'د مرکې چمتووالی'), purpose: 'Practice and concise interview advice', suggestedTemplate: 'tip' },
  { id: 'language-learning', label: labels('Language learning', 'آموزش زبان', 'د ژبې زده کړه'), purpose: 'Short language-learning lessons', suggestedTemplate: 'tip' },
  { id: 'student-life', label: labels('Student life', 'زندگی دانشجویی', 'د محصل ژوند'), purpose: 'Relatable, genuine university experiences', suggestedTemplate: 'story' },
  { id: 'productivity', label: labels('Study and productivity', 'درس و مدیریت زمان', 'زده کړه او د وخت مدیریت'), purpose: 'Practical study and planning help', suggestedTemplate: 'tip' },
  { id: 'free-resources', label: labels('Free learning resources', 'منابع رایگان آموزشی', 'وړیا زده کړې سرچینې'), purpose: 'Useful resources with checked access terms', suggestedTemplate: 'promo' },
  { id: 'ai-tools', label: labels('AI tools and tutorials', 'ابزارها و آموزش هوش مصنوعی', 'د مصنوعي ځیرکتیا وسیلې'), purpose: 'Hands-on technology tutorials', suggestedTemplate: 'news' },
  { id: 'tech-explainers', label: labels('Technology explained', 'توضیح سادهٔ تکنالوژی', 'د ټکنالوژۍ تشریح'), purpose: 'Accessible original tech explanations', suggestedTemplate: 'tip' },
  { id: 'community-question', label: labels('Community discussion', 'پرسش و گفت‌وگو', 'ټولنیزه پوښتنه'), purpose: 'Genuine questions without engagement bait', suggestedTemplate: 'pick' },
  { id: 'student-humor', label: labels('Relatable student humor', 'طنز دانشجویی', 'د محصلانو ټوکې'), purpose: 'Original, respectful student humor', suggestedTemplate: 'teaser' },
  { id: 'real-stories', label: labels('Verified community stories', 'داستان‌های واقعی', 'رښتینې کیسې'), purpose: 'Real testimonials, sourced and permissioned', suggestedTemplate: 'story', requiresConsent: true },
  { id: 'myth-fact', label: labels('Myth versus fact', 'باور نادرست یا واقعیت', 'ناسم باور او حقیقت'), purpose: 'Evidence-backed corrections of misconceptions', suggestedTemplate: 'tip', requiresSource: true },
  { id: 'quiz', label: labels('Educational quiz', 'آزمون کوتاه آموزشی', 'ښوونیزه پوښتنه'), purpose: 'Lightweight and genuinely educational questions', suggestedTemplate: 'pick' },
  { id: 'cultural', label: labels('Cultural and seasonal', 'مناسبت‌های فرهنگی', 'کلتوري مناسبتونه'), purpose: 'Relevant celebrations and observances', suggestedTemplate: 'greeting' },
  { id: 'aria-features', label: labels('ARIA HUB product tutorials', 'آموزش امکانات آریا هاب', 'د آریا هب لارښود'), purpose: 'Accurate demos of functioning ARIA HUB tools', suggestedTemplate: 'promo' },
  { id: 'opportunity-roundup', label: labels('Opportunity roundups', 'مجموعهٔ فرصت‌ها', 'د فرصتونو ټولګه'), purpose: 'Curated opportunities with verified eligibility', suggestedTemplate: 'spotlight', requiresSource: true },
  { id: 'deadline-alert', label: labels('Verified deadline alerts', 'یادآوری مهلت‌های درخواست', 'د وروستۍ نېټې یادونه'), purpose: 'Accurate, non-expired deadlines', suggestedTemplate: 'deadline', requiresSource: true },
  { id: 'verified-news', label: labels('Verified education and tech news', 'خبرهای تأییدشدهٔ آموزش و تکنالوژی', 'تایید شوي ښوونیز او ټکنالوژۍ خبرونه'), purpose: 'Source-first news that matters to students', suggestedTemplate: 'news', requiresSource: true },
  { id: 'inspiration', label: labels('Practical inspiration', 'انگیزه و تجربه‌های آموزنده', 'هڅونه او ګټورې تجربې'), purpose: 'Authentic encouragement with useful next steps', suggestedTemplate: 'quote' },
];

export type CreativeRecipe = {
  id: string;
  name: string;
  family: DesignFamilyId;
  template: PostTemplate;
  artDirection: string;
  suitableFor: string;
};

export const CREATIVE_RECIPES: CreativeRecipe[] = [
  { id: 'editorial-hook', name: 'Big headline', family: 'big-type-story', template: 'tip', artDirection: 'One dominant idea, oversized typography, generous negative space', suitableFor: 'Advice, quiz, myths, surprising insights' },
  { id: 'human-story', name: 'Human story', family: 'cinematic-person', template: 'story', artDirection: 'Real person or approved portrait in a bold editorial composition', suitableFor: 'Experiences, real stories, inspiration' },
  { id: 'concept-object', name: 'Object metaphor', family: 'object-hero-3d', template: 'promo', artDirection: 'One dramatic isolated object; use approved artwork in the hero layer', suitableFor: 'Resources, tools, technology explainers' },
  { id: 'visual-question', name: 'Community question', family: 'surreal-opportunity', template: 'pick', artDirection: 'Playful visual contrast and a short question, not a wall of text', suitableFor: 'Discussion, polls, respectful humor' },
  { id: 'news-cover', name: 'Editorial cover', family: 'editorial-break', template: 'news', artDirection: 'Strong headline and verified artwork or contextual photography', suitableFor: 'Verified technology or education news' },
  { id: 'practical-guide', name: 'Desk guide', family: 'document-desk', template: 'tip', artDirection: 'Application documents and structured, readable guidance', suitableFor: 'CV advice, scholarships, tutorials' },
  { id: 'global-path', name: 'Future pathway', family: 'global-portal', template: 'promo', artDirection: 'Gateway visual metaphor with space for a concise hook', suitableFor: 'Scholarships, careers, opportunities' },
  { id: 'career-journey', name: 'Career growth', family: 'career-ascent', template: 'hiring', artDirection: 'Directional composition showing progress and next steps', suitableFor: 'Interview and career development' },
];

export type EditorialDraft = {
  pillar: EditorialPillarId;
  title: string;
  note: string;
  caption: string;
  sourceUrl: string;
  consentConfirmed: boolean;
};

export function getEditorialPillar(id: EditorialPillarId): EditorialPillar {
  return EDITORIAL_PILLARS.find((pillar) => pillar.id === id) ?? EDITORIAL_PILLARS[0];
}

/** Persian/Arabic glyph variants normalize for editorial similarity checks. */
export function normalizeEditorialText(value: string): string {
  return value.normalize('NFKC')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200d]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLocaleLowerCase();
}

export function editorialSimilarity(a: string, b: string): number {
  const sa = new Set(normalizeEditorialText(a).split(' ').filter(Boolean));
  const sb = new Set(normalizeEditorialText(b).split(' ').filter(Boolean));
  if (!sa.size || !sb.size) return 0;
  let intersection = 0;
  for (const word of sa) if (sb.has(word)) intersection++;
  return intersection / (sa.size + sb.size - intersection);
}

export function reviewEditorialDraft(draft: EditorialDraft, recentHeadlines: string[] = []): {
  publishReady: boolean;
  warnings: string[];
  similarity: number;
} {
  const warnings: string[] = [];
  const pillar = getEditorialPillar(draft.pillar);
  const title = draft.title.trim();
  const note = draft.note.trim();
  if (title.length < 10) warnings.push('Use a meaningful, specific headline (at least 10 characters).');
  if (title.length > 115) warnings.push('Shorten the headline for mobile legibility (maximum 115 characters).');
  if (note.length > 170) warnings.push('Shorten supporting copy; use a carousel for longer explanations.');
  if (!draft.caption.trim()) warnings.push('Write a useful, original caption before publishing.');
  const source = draft.sourceUrl.trim();
  if (pillar.requiresSource && !/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(source)) {
    warnings.push('Provide a verified HTTPS primary source before publishing factual announcements.');
  }
  if (pillar.requiresConsent && !draft.consentConfirmed) {
    warnings.push('Confirm consent and verify the real person/story before publishing.');
  }
  const similarity = recentHeadlines.reduce((best, x) => Math.max(best, editorialSimilarity(title, x)), 0);
  if (similarity >= 0.8) warnings.push('This headline is very similar to another selected or recent post.');
  return { publishReady: warnings.length === 0, warnings, similarity };
}

export function recipesForPillar(pillar: EditorialPillarId): CreativeRecipe[] {
  const preferred: Record<EditorialPillarId, string[]> = {
    'career-skills': ['practical-guide', 'editorial-hook', 'career-journey'],
    'scholarship-help': ['practical-guide', 'global-path', 'editorial-hook'],
    'interview': ['career-journey', 'editorial-hook', 'human-story'],
    'language-learning': ['editorial-hook', 'practical-guide', 'concept-object'],
    'student-life': ['human-story', 'visual-question', 'editorial-hook'],
    'productivity': ['practical-guide', 'editorial-hook', 'concept-object'],
    'free-resources': ['concept-object', 'editorial-hook', 'global-path'],
    'ai-tools': ['concept-object', 'news-cover', 'editorial-hook'],
    'tech-explainers': ['concept-object', 'practical-guide', 'editorial-hook'],
    'community-question': ['visual-question', 'editorial-hook', 'human-story'],
    'student-humor': ['visual-question', 'human-story', 'editorial-hook'],
    'real-stories': ['human-story', 'editorial-hook', 'global-path'],
    'myth-fact': ['editorial-hook', 'practical-guide', 'news-cover'],
    'quiz': ['visual-question', 'editorial-hook', 'concept-object'],
    'cultural': ['human-story', 'concept-object', 'editorial-hook'],
    'aria-features': ['concept-object', 'practical-guide', 'editorial-hook'],
    'opportunity-roundup': ['global-path', 'editorial-hook', 'concept-object'],
    'deadline-alert': ['news-cover', 'global-path', 'editorial-hook'],
    'verified-news': ['news-cover', 'editorial-hook', 'concept-object'],
    'inspiration': ['human-story', 'editorial-hook', 'global-path'],
  };
  return preferred[pillar].map(id => CREATIVE_RECIPES.find(recipe => recipe.id === id)!);
}
