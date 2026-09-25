import type { PostTemplate } from '@/lib/social/brand';
import type { DesignFamilyDefinition, DesignFamilyId, StudioEditorField } from '@/lib/social/studio/types';

const opportunityFields: StudioEditorField[] = [
  { id: 'title', label: 'Headline', type: 'textarea', maxLength: 140, required: true, rtl: true },
  { id: 'eyebrow', label: 'Eyebrow / label', type: 'text', maxLength: 40, rtl: true },
  { id: 'organization', label: 'Organization', type: 'text', maxLength: 90, rtl: true },
  { id: 'country', label: 'Country / location', type: 'text', maxLength: 60, rtl: true },
  { id: 'salary', label: 'Salary / stipend', type: 'text', maxLength: 70, rtl: true },
  { id: 'funding', label: 'Funding status', type: 'text', maxLength: 60, rtl: true },
  { id: 'deadlineDate', label: 'Deadline', type: 'date' },
  { id: 'badge', label: 'Badge', type: 'text', maxLength: 42, rtl: true },
  { id: 'cta', label: 'CTA', type: 'text', maxLength: 44, rtl: true },
];

const careerFields: StudioEditorField[] = [
  { id: 'title', label: 'Role / headline', type: 'textarea', maxLength: 120, required: true, rtl: true },
  { id: 'eyebrow', label: 'Career label', type: 'text', maxLength: 40, rtl: true },
  { id: 'organization', label: 'Company / organization', type: 'text', maxLength: 80, rtl: true },
  { id: 'location', label: 'Location', type: 'text', maxLength: 60, rtl: true },
  { id: 'salary', label: 'Salary', type: 'text', maxLength: 70, rtl: true },
  { id: 'note', label: 'Supporting line', type: 'textarea', maxLength: 150, rtl: true },
  { id: 'deadlineDate', label: 'Deadline', type: 'date' },
  { id: 'cta', label: 'CTA', type: 'text', maxLength: 44, rtl: true },
];

const editorialFields: StudioEditorField[] = [
  { id: 'title', label: 'Headline', type: 'textarea', maxLength: 150, required: true, rtl: true },
  { id: 'eyebrow', label: 'News label', type: 'text', maxLength: 36, rtl: true },
  { id: 'note', label: 'Supporting line', type: 'textarea', maxLength: 180, rtl: true },
  { id: 'badge', label: 'Status badge', type: 'text', maxLength: 42, rtl: true },
  { id: 'cta', label: 'CTA', type: 'text', maxLength: 44, rtl: true },
];

const storyFields: StudioEditorField[] = [
  { id: 'title', label: 'Story headline', type: 'textarea', maxLength: 130, required: true, rtl: true },
  { id: 'eyebrow', label: 'Story label', type: 'text', maxLength: 36, rtl: true },
  { id: 'note', label: 'Supporting line', type: 'textarea', maxLength: 150, rtl: true },
  { id: 'badge', label: 'Badge', type: 'text', maxLength: 42, rtl: true },
  { id: 'cta', label: 'CTA', type: 'text', maxLength: 44, rtl: true },
];

const allSizes = ['square', 'portrait', 'story'] as const;

export const DESIGN_FAMILIES: DesignFamilyDefinition[] = [
  {
    id: 'legacy',
    label: 'Legacy / current',
    description: 'Existing ARIA HUB renderer for full backward compatibility.',
    category: 'legacy',
    supportedTemplates: ['spotlight','deadline','tip','quote','promo','news','stat','story','packages','teaser','greeting','hiring','follow','pick','day'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['classic','minimal','bold','split','frame','stack','glass','banner','ticket','cinema'],
    visualSlots: ['background'],
    editorFields: [],
  },
  {
    id: 'global-portal',
    label: 'Scholarship · Global Portal',
    description: 'Architectural doorway / portal composition with strong editorial asymmetry.',
    category: 'scholarship',
    supportedTemplates: ['spotlight','deadline','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['split','frame'],
    visualSlots: ['background','hero','foreground'],
    editorFields: opportunityFields,
  },
  {
    id: 'document-desk',
    label: 'Scholarship · Document Desk',
    description: 'Premium document, passport and application desk composition.',
    category: 'scholarship',
    supportedTemplates: ['spotlight','deadline','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['classic','glass'],
    visualSlots: ['background','hero','foreground'],
    editorFields: opportunityFields,
  },
  {
    id: 'global-object',
    label: 'Scholarship · Global Object',
    description: 'Large isolated 3D education object with whitespace and premium lighting.',
    category: 'scholarship',
    supportedTemplates: ['spotlight','deadline','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['minimal','frame'],
    visualSlots: ['hero','foreground'],
    editorFields: opportunityFields,
  },
  {
    id: 'career-desk',
    label: 'Career · Desk',
    description: 'Professional workstation or office subject with selective job metadata.',
    category: 'career',
    supportedTemplates: ['hiring','spotlight','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['split','classic'],
    visualSlots: ['background','hero','foreground'],
    editorFields: careerFields,
  },
  {
    id: 'career-ascent',
    label: 'Career · Ascent',
    description: 'Career growth metaphor using stairs, bridge, launch or directional geometry.',
    category: 'career',
    supportedTemplates: ['hiring','spotlight','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['bold','stack'],
    visualSlots: ['hero','foreground'],
    editorFields: careerFields,
  },
  {
    id: 'talent-profile',
    label: 'Career · Talent Profile',
    description: 'Human-led recruiting composition with a dominant professional cutout.',
    category: 'career',
    supportedTemplates: ['hiring','spotlight','story'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['split','frame'],
    visualSlots: ['background','hero'],
    editorFields: careerFields,
  },
  {
    id: 'editorial-break',
    label: 'News · Editorial Break',
    description: 'Magazine-like breaking-news cover with one strong image and oversized type.',
    category: 'editorial',
    supportedTemplates: ['news','deadline','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['minimal','banner'],
    visualSlots: ['background','hero'],
    editorFields: editorialFields,
  },
  {
    id: 'document-alert',
    label: 'News · Document Alert',
    description: 'Official-document / notification composition for results and policy updates.',
    category: 'editorial',
    supportedTemplates: ['news','deadline','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['frame','ticket'],
    visualSlots: ['hero','foreground'],
    editorFields: editorialFields,
  },
  {
    id: 'cinematic-person',
    label: 'Story · Cinematic Person',
    description: 'Vertical-first human portrait with cinematic gradient and editorial copy.',
    category: 'story',
    supportedTemplates: ['story','hiring','promo'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['cinema','split'],
    visualSlots: ['background','hero','foreground'],
    editorFields: storyFields,
  },
  {
    id: 'big-type-story',
    label: 'Story · Big Type',
    description: 'Oversized typographic cover with a small supporting visual.',
    category: 'story',
    supportedTemplates: ['story','quote','promo','tip'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['stack','minimal'],
    visualSlots: ['hero'],
    editorFields: storyFields,
  },
  {
    id: 'object-hero-3d',
    label: 'Concept · 3D Object Hero',
    description: 'Commercial product-stage composition for premium 3D hero objects.',
    category: 'conceptual',
    supportedTemplates: ['spotlight','deadline','hiring','promo','news'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['cinema','frame'],
    visualSlots: ['background','hero','foreground','overlay'],
    editorFields: opportunityFields,
  },
  {
    id: 'surreal-opportunity',
    label: 'Concept · Surreal Opportunity',
    description: 'High-end advertising metaphor with floating portal / bridge / world objects.',
    category: 'conceptual',
    supportedTemplates: ['spotlight','deadline','hiring','promo','news'],
    supportedSizes: [...allSizes],
    recommendedLayouts: ['cinema','split'],
    visualSlots: ['background','hero','foreground','overlay'],
    editorFields: opportunityFields,
  },
];

const FAMILY_BY_ID = new Map<DesignFamilyId, DesignFamilyDefinition>(
  DESIGN_FAMILIES.map((d) => [d.id, d]),
);

export function getDesignFamily(id: string | null | undefined): DesignFamilyDefinition {
  return FAMILY_BY_ID.get((id || 'legacy') as DesignFamilyId) ?? FAMILY_BY_ID.get('legacy')!;
}

export function resolveDesignFamily(id: string | null | undefined): DesignFamilyId {
  return getDesignFamily(id).id;
}

export function designFamiliesForTemplate(template: PostTemplate): DesignFamilyDefinition[] {
  return DESIGN_FAMILIES.filter((d) => d.supportedTemplates.includes(template));
}

export function defaultDesignFamilyForTemplate(template: PostTemplate): DesignFamilyId {
  if (template === 'spotlight' || template === 'deadline') return 'global-portal';
  if (template === 'hiring') return 'career-desk';
  if (template === 'news') return 'editorial-break';
  if (template === 'story') return 'cinematic-person';
  if (template === 'quote' || template === 'tip') return 'big-type-story';
  if (template === 'promo') return 'object-hero-3d';
  return 'legacy';
}
