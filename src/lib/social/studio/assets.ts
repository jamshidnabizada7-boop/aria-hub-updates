import type { StudioDesignFamilyId, StudioVisualRole } from '@/lib/social/studio/registry';
import {
  defaultStudioVisualLayer,
  type StudioMediaState,
} from '@/lib/social/studio/media';

export interface BuiltInStudioVisual {
  id: string;
  label: string;
  category: string;
  url: string;
  enabled: true;
  builtIn: true;
  preferredRole: StudioVisualRole;
}

export const BUILT_IN_STUDIO_VISUALS: BuiltInStudioVisual[] = [
  {
    id: 'builtin-professional-person',
    label: 'Professional person',
    category: 'Professionals',
    url: '/images/studio/premium/professional-person.png',
    enabled: true,
    builtIn: true,
    preferredRole: 'hero',
  },
  {
    id: 'builtin-graduation-globe',
    label: 'Graduation globe',
    category: '3D Objects',
    url: '/images/studio/premium/graduation-globe.png',
    enabled: true,
    builtIn: true,
    preferredRole: 'hero',
  },
  {
    id: 'builtin-scholarship-documents',
    label: 'Scholarship documents',
    category: 'Documents',
    url: '/images/studio/premium/scholarship-documents.png',
    enabled: true,
    builtIn: true,
    preferredRole: 'hero',
  },
  {
    id: 'builtin-opportunity-portal',
    label: 'Opportunity portal',
    category: 'Career',
    url: '/images/studio/premium/opportunity-portal.png',
    enabled: true,
    builtIn: true,
    preferredRole: 'hero',
  },
];

const DEFAULT_HERO_BY_FAMILY: Partial<Record<StudioDesignFamilyId, BuiltInStudioVisual['id']>> = {
  'scholarship-global-portal': 'builtin-opportunity-portal',
  'scholarship-document-desk': 'builtin-scholarship-documents',
  'scholarship-global-object': 'builtin-graduation-globe',
  'career-desk': 'builtin-professional-person',
  'career-ascent': 'builtin-opportunity-portal',
  'career-talent': 'builtin-professional-person',
  'document-alert': 'builtin-scholarship-documents',
  'story-cinematic': 'builtin-professional-person',
  'story-big-type': 'builtin-graduation-globe',
  'concept-object-hero': 'builtin-graduation-globe',
  'concept-surreal': 'builtin-opportunity-portal',
};

export function defaultMediaForFamily(familyId: StudioDesignFamilyId): StudioMediaState {
  const id = DEFAULT_HERO_BY_FAMILY[familyId];
  if (!id) return {};
  const asset = BUILT_IN_STUDIO_VISUALS.find((item) => item.id === id);
  if (!asset) return {};
  const hero = defaultStudioVisualLayer('hero', asset.url, asset.id);

  // Family-specific art direction. These values remain fully editable in the
  // Studio and are merely the first-use composition.
  if (familyId === 'career-talent') {
    hero.x = 73;
    hero.y = 53;
    hero.scale = 1.12;
  } else if (familyId === 'career-desk') {
    hero.x = 72;
    hero.y = 53;
    hero.scale = 1.02;
  } else if (familyId === 'story-cinematic') {
    hero.x = 52;
    hero.y = 46;
    hero.scale = 1.28;
  } else if (familyId === 'scholarship-document-desk') {
    hero.x = 76;
    hero.y = 48;
    hero.scale = 0.92;
  } else if (familyId === 'scholarship-global-object' || familyId === 'concept-object-hero') {
    hero.x = familyId === 'concept-object-hero' ? 50 : 70;
    hero.y = 44;
    hero.scale = 0.96;
  } else {
    hero.x = 70;
    hero.y = 46;
    hero.scale = 1.0;
  }
  return { hero };
}
