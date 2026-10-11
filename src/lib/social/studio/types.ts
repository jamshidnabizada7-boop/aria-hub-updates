import type { Lang } from '@/lib/lang-route';
import type { PostTemplate } from '@/lib/social/brand';
import type { PosterSize } from '@/lib/social/templates';

export type DesignFamilyId =
  | 'career-ledger'
  | 'career-signal'
  | 'career-ticket'
  | 'scholarship-atlas'
  | 'scholarship-journal'
  | 'scholarship-fellow'
  | 'deadline-clock'
  | 'deadline-bulletin'
  | 'deadline-calendar'
  | 'legacy'
  | 'global-portal'
  | 'document-desk'
  | 'global-object'
  | 'career-desk'
  | 'career-ascent'
  | 'talent-profile'
  | 'editorial-break'
  | 'document-alert'
  | 'cinematic-person'
  | 'big-type-story'
  | 'object-hero-3d'
  | 'surreal-opportunity';

export type StudioFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'toggle'
  | 'list'
  | 'asset';

export interface StudioEditorField {
  id: string;
  label: string;
  type: StudioFieldType;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  rtl?: boolean;
  options?: { value: string; label: string }[];
}

export type StudioMediaRole = 'background' | 'hero' | 'foreground' | 'overlay';

export interface StudioMediaLayer {
  visualId?: string | null;
  url?: string | null;
  visible?: boolean;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  shadow?: number;
  glow?: number;
  flipX?: boolean;
  fit?: 'cover' | 'contain';
  radius?: number;
}

export type StudioMediaConfig = Partial<Record<StudioMediaRole, StudioMediaLayer>>;

export interface DesignFamilyDefinition {
  id: DesignFamilyId;
  label: string;
  description: string;
  category: 'legacy' | 'scholarship' | 'career' | 'editorial' | 'story' | 'conceptual';
  supportedTemplates: PostTemplate[];
  supportedSizes: PosterSize[];
  recommendedLayouts: string[];
  visualSlots: StudioMediaRole[];
  editorFields: StudioEditorField[];
}

export interface PremiumCanvasProps {
  template: PostTemplate;
  designFamily: DesignFamilyId;
  lang: Lang;
  size: PosterSize;
  themeId?: string;
  title: string;
  note?: string;
  eyebrow?: string;
  category?: string;
  organization?: string;
  country?: string;
  location?: string;
  salary?: string;
  funding?: string;
  deadlineDate?: string | null;
  badge?: string;
  cta?: string;
  qrDataUrl?: string | null;
  visualUrl?: string | null;
  media?: StudioMediaConfig;
}

export const DEFAULT_MEDIA_LAYER: Required<Omit<StudioMediaLayer, 'visualId' | 'url'>> = {
  visible: true,
  x: 50,
  y: 50,
  scale: 1,
  rotation: 0,
  opacity: 1,
  blur: 0,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  shadow: 0.42,
  glow: 0,
  flipX: false,
  fit: 'contain',
  radius: 0,
};
