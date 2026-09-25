import type { PostTemplate } from '@/lib/social/brand';
import type { StudioLayout, StudioThemeId } from '@/lib/social/themes';

export type StudioFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'list'
  | 'toggle'
  | 'select'
  | 'url';

export interface StudioEditorField {
  id: string;
  label: string;
  type: StudioFieldType;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  rtl?: boolean;
  options?: { value: string; label: string }[];
  group?: 'content' | 'metadata' | 'brand';
  help?: string;
}

export type StudioVisualRole = 'background' | 'hero' | 'foreground' | 'texture';

export interface StudioVisualSlotDefinition {
  role: StudioVisualRole;
  label: string;
  optional?: boolean;
  recommendedCategories?: string[];
}

export interface StudioTemplateDefinition {
  id: PostTemplate;
  family: 'opportunity' | 'editorial' | 'brand' | 'story' | 'utility';
  labelKey: string;
  fields: StudioEditorField[];
  supportedSizes: ('square' | 'portrait' | 'story')[];
  supportedLayouts?: StudioLayout[];
}

export type StudioDesignFamilyId =
  | 'legacy'
  | 'scholarship-global-portal'
  | 'scholarship-document-desk'
  | 'scholarship-global-object'
  | 'career-desk'
  | 'career-ascent'
  | 'career-talent'
  | 'editorial-break'
  | 'document-alert'
  | 'story-cinematic'
  | 'story-big-type'
  | 'concept-object-hero'
  | 'concept-surreal';

export interface StudioDesignFamilyDefinition {
  id: StudioDesignFamilyId;
  label: string;
  group: 'Legacy' | 'Scholarship' | 'Career' | 'Editorial' | 'Story' | 'Concept';
  description: string;
  compatibleTemplates: PostTemplate[];
  recommendedLayouts: StudioLayout[];
  defaultTheme: StudioThemeId;
  visualSlots: StudioVisualSlotDefinition[];
  premium: boolean;
}

const COMMON_PREMIUM_FIELDS: StudioEditorField[] = [
  { id: 'eyebrow', label: 'Eyebrow / label', type: 'text', maxLength: 48, group: 'content', rtl: true },
  { id: 'subheadline', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
  { id: 'badge', label: 'Badge', type: 'text', maxLength: 48, group: 'metadata', rtl: true },
  { id: 'ctaLabel', label: 'CTA label', type: 'text', maxLength: 48, group: 'brand', rtl: true },
  { id: 'accentText', label: 'Accent word / phrase', type: 'text', maxLength: 48, group: 'brand', rtl: true, help: 'Optional exact phrase to emphasize in gold.' },
  { id: 'showFooter', label: 'Show footer', type: 'toggle', group: 'brand' },
  { id: 'showQr', label: 'Show QR code', type: 'toggle', group: 'brand' },
];

const BASE_FIELDS: Record<PostTemplate, StudioEditorField[]> = {
  spotlight: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 180, required: true, group: 'content', rtl: true },
    { id: 'category', label: 'Category', type: 'text', maxLength: 64, group: 'metadata', rtl: true },
    { id: 'organization', label: 'Organization', type: 'text', maxLength: 100, group: 'metadata', rtl: true },
    { id: 'country', label: 'Country / location', type: 'text', maxLength: 80, group: 'metadata', rtl: true },
    { id: 'salary', label: 'Salary / stipend', type: 'text', maxLength: 80, group: 'metadata', rtl: true },
    { id: 'fundingStatus', label: 'Funding status', type: 'text', maxLength: 64, group: 'metadata', rtl: true },
    { id: 'degreeLevel', label: 'Degree level', type: 'text', maxLength: 64, group: 'metadata', rtl: true },
    { id: 'deadlineDate', label: 'Deadline', type: 'date', group: 'metadata' },
  ],
  deadline: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 180, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
    { id: 'deadlineDate', label: 'Deadline', type: 'date', group: 'metadata' },
  ],
  tip: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 180, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
  ],
  quote: [
    { id: 'title', label: 'Quote', type: 'textarea', maxLength: 260, required: true, group: 'content', rtl: true },
  ],
  promo: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 180, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
    { id: 'items', label: 'Checklist', type: 'list', maxLength: 90, group: 'metadata', rtl: true },
  ],
  news: [
    { id: 'title', label: 'Headline', type: 'text', maxLength: 180, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Summary', type: 'textarea', maxLength: 220, group: 'content', rtl: true },
  ],
  stat: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 150, required: true, group: 'content', rtl: true },
    { id: 'statValue', label: 'Stat value', type: 'text', maxLength: 32, group: 'metadata' },
    { id: 'statLabel', label: 'Stat label', type: 'text', maxLength: 80, group: 'metadata', rtl: true },
  ],
  story: [
    { id: 'title', label: 'Story excerpt', type: 'textarea', maxLength: 260, required: true, group: 'content', rtl: true },
    { id: 'personName', label: 'Person name', type: 'text', maxLength: 90, group: 'metadata', rtl: true },
    { id: 'personMeta', label: 'Person detail', type: 'text', maxLength: 120, group: 'metadata', rtl: true },
  ],
  packages: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 150, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
    { id: 'p1Value', label: 'Card 1 value', type: 'text', maxLength: 32, group: 'metadata' },
    { id: 'p1Label', label: 'Card 1 label', type: 'text', maxLength: 80, group: 'metadata', rtl: true },
    { id: 'p2Value', label: 'Card 2 value', type: 'text', maxLength: 32, group: 'metadata' },
    { id: 'p2Label', label: 'Card 2 label', type: 'text', maxLength: 80, group: 'metadata', rtl: true },
  ],
  teaser: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 150, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
  ],
  greeting: [
    { id: 'title', label: 'Greeting', type: 'text', maxLength: 150, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
  ],
  hiring: [
    { id: 'title', label: 'Role / headline', type: 'text', maxLength: 180, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
    { id: 'callouts', label: 'Callouts', type: 'list', maxLength: 90, group: 'metadata', rtl: true },
  ],
  follow: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 140, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
  ],
  pick: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 140, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
    { id: 'callouts', label: 'Side tiles', type: 'list', maxLength: 80, group: 'metadata', rtl: true },
  ],
  day: [
    { id: 'title', label: 'Title', type: 'text', maxLength: 140, required: true, group: 'content', rtl: true },
    { id: 'note', label: 'Supporting line', type: 'text', maxLength: 150, group: 'content', rtl: true },
    { id: 'badgeBig', label: 'Date badge', type: 'text', maxLength: 48, group: 'metadata', rtl: true },
    { id: 'badgeSmall', label: 'Badge detail', type: 'text', maxLength: 64, group: 'metadata', rtl: true },
  ],
};

const TEMPLATE_FAMILY: Record<PostTemplate, StudioTemplateDefinition['family']> = {
  spotlight: 'opportunity',
  deadline: 'opportunity',
  tip: 'editorial',
  quote: 'editorial',
  promo: 'brand',
  news: 'editorial',
  stat: 'brand',
  story: 'story',
  packages: 'utility',
  teaser: 'brand',
  greeting: 'brand',
  hiring: 'opportunity',
  follow: 'brand',
  pick: 'brand',
  day: 'editorial',
};

export const STUDIO_TEMPLATE_DEFINITIONS: Record<PostTemplate, StudioTemplateDefinition> =
  Object.fromEntries(
    (Object.keys(BASE_FIELDS) as PostTemplate[]).map((id) => [
      id,
      {
        id,
        family: TEMPLATE_FAMILY[id],
        labelKey: `admin.studio.type.${id}`,
        fields: [...BASE_FIELDS[id], ...COMMON_PREMIUM_FIELDS],
        supportedSizes: ['square', 'portrait', 'story'],
      } satisfies StudioTemplateDefinition,
    ]),
  ) as Record<PostTemplate, StudioTemplateDefinition>;

const opportunityTemplates: PostTemplate[] = ['spotlight', 'deadline', 'hiring'];
const broadTemplates: PostTemplate[] = [
  'spotlight', 'deadline', 'tip', 'quote', 'promo', 'news', 'stat', 'story',
  'packages', 'teaser', 'greeting', 'hiring', 'follow', 'pick', 'day',
];

export const STUDIO_DESIGN_FAMILIES: StudioDesignFamilyDefinition[] = [
  {
    id: 'legacy',
    label: 'ARIA HUB Classic',
    group: 'Legacy',
    description: 'Current deterministic templates and layout system.',
    compatibleTemplates: broadTemplates,
    recommendedLayouts: ['classic', 'minimal', 'bold', 'split', 'frame', 'stack', 'glass', 'banner', 'ticket', 'cinema'],
    defaultTheme: 'midnight',
    visualSlots: [{ role: 'background', label: 'Background visual', optional: true }],
    premium: false,
  },
  {
    id: 'scholarship-global-portal',
    label: 'Scholarship · Global Portal',
    group: 'Scholarship',
    description: 'Cinematic opportunity portal with strong asymmetrical editorial copy.',
    compatibleTemplates: ['spotlight', 'deadline'],
    recommendedLayouts: ['split', 'cinema'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'background', label: 'Campus / world background', optional: true, recommendedCategories: ['University', 'Maps', 'Background'] },
      { role: 'hero', label: 'Portal / graduate hero', optional: true, recommendedCategories: ['Students', 'Graduates', '3D Objects'] },
      { role: 'foreground', label: 'Foreground light / object', optional: true, recommendedCategories: ['Foreground', 'Lighting'] },
    ],
    premium: true,
  },
  {
    id: 'scholarship-document-desk',
    label: 'Scholarship · Document Desk',
    group: 'Scholarship',
    description: 'Premium document, passport and acceptance-letter still life.',
    compatibleTemplates: ['spotlight', 'deadline'],
    recommendedLayouts: ['frame', 'split'],
    defaultTheme: 'ivory',
    visualSlots: [
      { role: 'background', label: 'Desk / paper background', optional: true, recommendedCategories: ['Documents', 'Background'] },
      { role: 'hero', label: 'Documents / passport hero', optional: true, recommendedCategories: ['Documents', 'Passports', 'Education'] },
      { role: 'foreground', label: 'Pen / ticket / detail', optional: true, recommendedCategories: ['Foreground', 'Travel'] },
    ],
    premium: true,
  },
  {
    id: 'scholarship-global-object',
    label: 'Scholarship · Global Object',
    group: 'Scholarship',
    description: 'Minimal premium object stage for globe, medal or graduation symbols.',
    compatibleTemplates: ['spotlight', 'deadline'],
    recommendedLayouts: ['minimal', 'stack'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'hero', label: '3D global hero', optional: true, recommendedCategories: ['3D Objects', 'Education', 'Maps'] },
      { role: 'foreground', label: 'Secondary object', optional: true, recommendedCategories: ['Foreground', 'Education'] },
    ],
    premium: true,
  },
  {
    id: 'career-desk',
    label: 'Career · Professional Desk',
    group: 'Career',
    description: 'Photoreal office/workstation campaign composition.',
    compatibleTemplates: opportunityTemplates,
    recommendedLayouts: ['split', 'frame'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'background', label: 'Office background', optional: true, recommendedCategories: ['Office', 'Career', 'Background'] },
      { role: 'hero', label: 'Professional / workstation hero', optional: true, recommendedCategories: ['Professionals', 'Office', 'Technology'] },
    ],
    premium: true,
  },
  {
    id: 'career-ascent',
    label: 'Career · Ascent',
    group: 'Career',
    description: 'Concept-driven stairs, doorway, bridge or launchpad career metaphor.',
    compatibleTemplates: opportunityTemplates,
    recommendedLayouts: ['cinema', 'split'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'background', label: 'Atmospheric background', optional: true, recommendedCategories: ['Background', 'Abstract'] },
      { role: 'hero', label: 'Ascent metaphor hero', optional: true, recommendedCategories: ['Career', '3D Objects', 'Abstract'] },
      { role: 'foreground', label: 'Foreground depth', optional: true, recommendedCategories: ['Foreground', 'Lighting'] },
    ],
    premium: true,
  },
  {
    id: 'career-talent',
    label: 'Career · Talent Profile',
    group: 'Career',
    description: 'Premium person cutout with asymmetric role information.',
    compatibleTemplates: ['spotlight', 'hiring'],
    recommendedLayouts: ['split', 'minimal'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'background', label: 'Editorial background', optional: true, recommendedCategories: ['Office', 'Background'] },
      { role: 'hero', label: 'Professional person', optional: true, recommendedCategories: ['Professionals', 'People'] },
    ],
    premium: true,
  },
  {
    id: 'editorial-break',
    label: 'News · Editorial Break',
    group: 'Editorial',
    description: 'International newsroom-style full-bleed image and large headline.',
    compatibleTemplates: ['news', 'deadline', 'day'],
    recommendedLayouts: ['minimal', 'banner'],
    defaultTheme: 'ivory',
    visualSlots: [
      { role: 'background', label: 'News image', optional: true, recommendedCategories: ['Background', 'Documents', 'People'] },
      { role: 'foreground', label: 'Editorial accent visual', optional: true, recommendedCategories: ['Foreground'] },
    ],
    premium: true,
  },
  {
    id: 'document-alert',
    label: 'News · Document Alert',
    group: 'Editorial',
    description: 'Official-document/notification composition for results, openings and policy updates.',
    compatibleTemplates: ['news', 'deadline', 'day'],
    recommendedLayouts: ['frame', 'ticket'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'hero', label: 'Document / notification hero', optional: true, recommendedCategories: ['Documents', '3D Objects'] },
      { role: 'background', label: 'Background texture', optional: true, recommendedCategories: ['Texture', 'Background'] },
    ],
    premium: true,
  },
  {
    id: 'story-cinematic',
    label: 'Story · Cinematic Person',
    group: 'Story',
    description: 'Vertical-first cinematic person cover with editorial overlay.',
    compatibleTemplates: ['story', 'quote', 'tip'],
    recommendedLayouts: ['cinema', 'split'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'background', label: 'Atmospheric background', optional: true, recommendedCategories: ['Background', 'University', 'Office'] },
      { role: 'hero', label: 'Person hero', optional: true, recommendedCategories: ['Students', 'Graduates', 'Professionals', 'People'] },
      { role: 'foreground', label: 'Foreground depth', optional: true, recommendedCategories: ['Foreground', 'Lighting'] },
    ],
    premium: true,
  },
  {
    id: 'story-big-type',
    label: 'Story · Big Type',
    group: 'Story',
    description: 'Oversized typography and disciplined whitespace for stories/reel covers.',
    compatibleTemplates: ['story', 'quote', 'tip', 'promo'],
    recommendedLayouts: ['stack', 'minimal'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'hero', label: 'Small supporting hero', optional: true, recommendedCategories: ['People', '3D Objects', 'Education'] },
    ],
    premium: true,
  },
  {
    id: 'concept-object-hero',
    label: 'Concept · 3D Object Hero',
    group: 'Concept',
    description: 'Commercial object-on-pedestal composition with studio lighting and realistic depth.',
    compatibleTemplates: broadTemplates,
    recommendedLayouts: ['cinema', 'frame'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'background', label: 'Studio background', optional: true, recommendedCategories: ['Background', 'Lighting'] },
      { role: 'hero', label: '3D hero object', optional: true, recommendedCategories: ['3D Objects', 'Education', 'Career', 'Travel'] },
      { role: 'foreground', label: 'Foreground object', optional: true, recommendedCategories: ['Foreground'] },
    ],
    premium: true,
  },
  {
    id: 'concept-surreal',
    label: 'Concept · Surreal Opportunity',
    group: 'Concept',
    description: 'High-end visual metaphor such as a portal, bridge, floating campus or opportunity key.',
    compatibleTemplates: broadTemplates,
    recommendedLayouts: ['cinema', 'split'],
    defaultTheme: 'midnight',
    visualSlots: [
      { role: 'background', label: 'Surreal environment', optional: true, recommendedCategories: ['Background', 'Abstract', 'University'] },
      { role: 'hero', label: 'Metaphor hero', optional: true, recommendedCategories: ['3D Objects', 'Career', 'Education'] },
      { role: 'foreground', label: 'Atmospheric foreground', optional: true, recommendedCategories: ['Foreground', 'Lighting'] },
    ],
    premium: true,
  },
];

export function getStudioTemplateDefinition(template: PostTemplate): StudioTemplateDefinition {
  return STUDIO_TEMPLATE_DEFINITIONS[template];
}

export function getStudioDesignFamily(id: string | null | undefined): StudioDesignFamilyDefinition {
  return STUDIO_DESIGN_FAMILIES.find((f) => f.id === id) ?? STUDIO_DESIGN_FAMILIES[0];
}

export function getCompatibleDesignFamilies(template: PostTemplate): StudioDesignFamilyDefinition[] {
  return STUDIO_DESIGN_FAMILIES.filter((f) => f.compatibleTemplates.includes(template));
}
