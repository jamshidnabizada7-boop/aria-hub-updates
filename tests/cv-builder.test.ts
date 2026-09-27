import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDraft, normalizeDraft, safeExternalUrl } from '../src/app/[lang]/cv-builder/lib/cv-utils';
import { getRecommendedSections, validateDraft } from '../src/app/[lang]/cv-builder/lib/cv-validation';
import { cvText } from '../src/app/[lang]/cv-builder/lib/cv-copy';
import { CV_TEMPLATES } from '../src/app/[lang]/cv-builder/lib/cv-templates';
import { cvRendererCss, renderCvBody, renderCvStandaloneHtml } from '../src/app/[lang]/cv-builder/lib/cv-renderer';
import {
  DEFAULT_CV_BUILDER_ADMIN_CONFIG,
  normalizeCVBuilderAdminConfig,
} from '../src/app/[lang]/cv-builder/lib/cv-admin-config';

describe('CV Builder draft model', () => {
  test('creates a versioned purpose-aware draft', () => {
    const professional = createDraft('professional', 'en');
    const scholarship = createDraft('scholarship', 'fa');
    expect(professional.schemaVersion).toBe(4);
    expect(professional.template).toBe('ats-simple');
    expect(scholarship.template).toBe('academic-research');
    expect(scholarship.outputLang).toBe('fa');
    expect(professional.appearance.density).toBe('comfortable');
  });

  test('migrates legacy templates and internal enum labels', () => {
    const migrated = normalizeDraft({
      template: 'modern',
      personal: {
        fullName: 'Test User',
        linkedIn: 'https://linkedin.com/in/test',
        gender: 'Male',
      },
      skills: [{ id: 's1', name: 'Python', level: 'Expert' }],
      languages: [{ id: 'l1', name: 'English', proficiency: 'Fluent' }],
      education: [], experience: [], certifications: [], projects: [], references: [],
    });
    expect(migrated).not.toBeNull();
    expect(migrated!.template).toBe('modern-sidebar');
    expect(migrated!.data.personal.gender).toBe('male');
    expect(migrated!.data.skills[0].level).toBe('expert');
    expect(migrated!.data.languages[0].proficiency).toBe('fluent');
    expect(migrated!.data.socialLinks[0].platform).toBe('LinkedIn');
  });
});

describe('CV Builder URL safety', () => {
  test('permits ordinary http(s) links only', () => {
    expect(safeExternalUrl('https://example.com/profile')).toContain('https://example.com/profile');
    expect(safeExternalUrl('http://example.com')).toContain('http://example.com');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,hello')).toBeNull();
    expect(safeExternalUrl('not a url')).toBeNull();
  });
});

describe('CV Builder readiness and exact error targeting', () => {
  test('blocks export for a blank draft', () => {
    const readiness = validateDraft(createDraft('professional', 'en'));
    expect(readiness.canExport).toBe(false);
    expect(readiness.errorCount).toBeGreaterThan(0);
    expect(readiness.health).toBe('blocked');
    expect(readiness.issues.find((issue) => issue.id === 'full-name-required')?.anchorId).toBe('cv-full-name');
  });

  test('detects invalid date ordering and unsafe links with exact field anchors', () => {
    const draft = createDraft('student', 'en');
    draft.data.personal.fullName = 'Student';
    draft.data.personal.email = 'student@example.com';
    draft.data.education.push({
      id: 'edu1', degree: 'BS', institution: 'University', location: '',
      startDate: '2026-09', endDate: '2025-06', isCurrent: false, description: '',
    });
    draft.data.projects.push({
      id: 'p1', name: 'ARIA HUB', role: '', startDate: '', endDate: '',
      description: 'Built a project', link: 'javascript:alert(1)', technologies: '',
    });
    const readiness = validateDraft(draft);
    expect(readiness.canExport).toBe(false);
    expect(readiness.issues.find((issue) => issue.id === 'education-date-edu1')?.anchorId).toBe('edu-edu1-end');
    const projectIssue = readiness.issues.find((issue) => issue.id === 'project-url-p1');
    expect(projectIssue?.anchorId).toBe('project-link-p1');
    expect(projectIssue?.itemLabel).toBe('ARIA HUB');
  });

  test('allows a minimally substantive valid CV to export', () => {
    const draft = createDraft('professional', 'en');
    draft.data.personal.fullName = 'Candidate';
    draft.data.personal.email = 'candidate@example.com';
    draft.data.experience.push({
      id: 'e1', role: 'Developer', company: 'Example', location: 'Remote',
      startDate: '2025-01', endDate: '', isCurrent: true,
      description: 'Built and maintained user-facing features.',
    });
    const readiness = validateDraft(draft);
    expect(readiness.canExport).toBe(true);
  });

  test('purpose-specific recommendations include academic and student content', () => {
    expect(getRecommendedSections(createDraft('scholarship', 'en'))).toContain('research');
    expect(getRecommendedSections(createDraft('scholarship', 'en'))).toContain('publications');
    expect(getRecommendedSections(createDraft('student', 'en'))).toContain('volunteering');
    expect(getRecommendedSections(createDraft('student', 'en'))).toContain('projects');
  });
});

describe('CV Builder templates and preview/PDF parity', () => {
  test('ships eight structurally distinct template choices', () => {
    expect(CV_TEMPLATES).toHaveLength(8);
    expect(new Set(CV_TEMPLATES.map((template) => template.id)).size).toBe(8);
    expect(CV_TEMPLATES.filter((template) => template.atsFocused)).toHaveLength(2);
  });

  test('uses one shared renderer for web preview and standalone PDF HTML', () => {
    const draft = createDraft('professional', 'en');
    draft.data.personal.fullName = 'Candidate';
    draft.data.personal.email = 'candidate@example.com';
    draft.data.education.push({
      id: 'edu', degree: 'BS Computer Science', institution: 'University', location: '',
      startDate: '2024-09', endDate: '', isCurrent: true, description: 'Coursework',
    });
    const body = renderCvBody(draft);
    const html = renderCvStandaloneHtml(draft);
    expect(html).toContain(body);
    expect(body).toContain('Candidate');
    expect(body).toContain('BS Computer Science');
  });

  test('guards long unbroken summary text from crossing layout columns', () => {
    expect(cvRendererCss).toContain('overflow-wrap:anywhere');
    expect(cvRendererCss).toContain('word-break:break-word');
    expect(cvRendererCss).toContain('min-width:0');
  });

  test('escapes user HTML in generated CV markup', () => {
    const draft = createDraft('professional', 'en');
    draft.data.personal.fullName = '<script>alert(1)</script>';
    const body = renderCvBody(draft);
    expect(body).not.toContain('<script>alert(1)</script>');
    expect(body).toContain('&lt;script&gt;');
  });
});


describe('CV Builder admin linkage', () => {
  test('admin config normalizes safely and always preserves a usable builder', () => {
    const config = normalizeCVBuilderAdminConfig({
      enabled: true,
      defaultPurpose: 'scholarship',
      purposes: {
        professional: { enabled: false },
        student: { enabled: false },
        scholarship: { enabled: false },
      },
      templates: Object.fromEntries(CV_TEMPLATES.map((template) => [template.id, { enabled: false, order: 0 }])),
      sections: { personal: { enabled: false } },
      guidance: { summaryMinWords: 70, summaryMaxWords: 30, maxSkills: 200 },
    });

    expect(config.purposes.professional.enabled).toBe(true);
    expect(config.templates['ats-simple'].enabled).toBe(true);
    expect(config.sections.personal.enabled).toBe(true);
    expect(config.defaultPurpose).toBe('professional');
    expect(config.guidance.summaryMinWords).toBe(70);
    expect(config.guidance.summaryMaxWords).toBeGreaterThanOrEqual(70);
    expect(config.guidance.maxSkills).toBe(50);
  });

  test('configured template and paper defaults apply to newly created drafts', () => {
    const draft = createDraft('student', 'fa', undefined, {
      template: 'minimal-elegant',
      paperSize: 'letter',
    });
    expect(draft.template).toBe('minimal-elegant');
    expect(draft.paperSize).toBe('letter');
    expect(draft.outputLang).toBe('fa');
  });

  test('disabled sections disappear from output and their hidden errors do not block export', () => {
    const config = normalizeCVBuilderAdminConfig({
      ...DEFAULT_CV_BUILDER_ADMIN_CONFIG,
      sections: {
        ...DEFAULT_CV_BUILDER_ADMIN_CONFIG.sections,
        projects: { enabled: false },
      },
    });
    const draft = createDraft('professional', 'en');
    draft.data.personal.fullName = 'Candidate';
    draft.data.personal.email = 'candidate@example.com';
    draft.data.experience.push({
      id: 'e1', role: 'Developer', company: 'Example', location: '',
      startDate: '2025-01', endDate: '', isCurrent: true, description: 'Built products.',
    });
    draft.data.projects.push({
      id: 'hidden-project', name: 'Hidden Admin Project', role: '', startDate: '2026-12',
      endDate: '2025-01', description: '', link: 'javascript:alert(1)', technologies: '',
    });

    const body = renderCvBody(draft, config);
    const readiness = validateDraft(draft, config);

    expect(body).not.toContain('Hidden Admin Project');
    expect(readiness.issues.some((issue) => issue.id === 'project-url-hidden-project')).toBe(false);
    expect(readiness.issues.some((issue) => issue.id === 'project-date-hidden-project')).toBe(false);
    expect(readiness.canExport).toBe(true);
  });

  test('photo and quality guidance policies are enforced by shared validation and renderer', () => {
    const config = normalizeCVBuilderAdminConfig({
      ...DEFAULT_CV_BUILDER_ADMIN_CONFIG,
      features: {
        ...DEFAULT_CV_BUILDER_ADMIN_CONFIG.features,
        allowPhoto: false,
        allowAccentCustomization: false,
        allowDensityCustomization: false,
      },
      guidance: { summaryMinWords: 10, summaryMaxWords: 12, maxSkills: 5 },
    });
    const draft = createDraft('professional', 'en', undefined, { template: 'modern-sidebar' });
    draft.data.personal.fullName = 'Candidate';
    draft.data.personal.email = 'candidate@example.com';
    draft.data.personal.picture = 'data:image/png;base64,AAAA';
    draft.appearance.accent = 'emerald';
    draft.appearance.density = 'compact';
    draft.data.personal.summary = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    draft.data.experience.push({
      id: 'e1', role: 'Developer', company: 'Example', location: '',
      startDate: '', endDate: '', isCurrent: true, description: 'Built products.',
    });
    draft.data.skills = [
      { id: 's1', name: 'TypeScript', level: 'expert' },
      { id: 's2', name: 'React', level: 'expert' },
      { id: 's3', name: 'PostgreSQL', level: 'intermediate' },
      { id: 's4', name: 'Node.js', level: 'expert' },
      { id: 's5', name: 'Docker', level: 'intermediate' },
      { id: 's6', name: 'Git', level: 'expert' },
    ];

    const body = renderCvBody(draft, config);
    const readiness = validateDraft(draft, config);

    expect(body).not.toContain('cv-photo');
    expect(body).toContain('cv-density-comfortable');
    expect(body).toContain('--cv-accent:#172554');
    expect(readiness.issues.some((issue) => issue.id === 'summary-long')).toBe(true);
    expect(readiness.issues.some((issue) => issue.id === 'too-many-skills')).toBe(true);
  });

  test('dedicated admin panel, CMS storage, public page, and PDF route share one configuration path', () => {
    const admin = readFileSync(join(process.cwd(), 'src/app/admin/admin-app.tsx'), 'utf8');
    const adminRoute = readFileSync(join(process.cwd(), 'src/app/api/admin/cv-builder/route.ts'), 'utf8');
    const publicPage = readFileSync(join(process.cwd(), 'src/app/[lang]/cv-builder/page.tsx'), 'utf8');
    const pdfRoute = readFileSync(join(process.cwd(), 'src/app/api/cv-builder/pdf/route.ts'), 'utf8');
    const loader = readFileSync(join(process.cwd(), 'src/lib/cv-builder-config.server.ts'), 'utf8');

    expect(admin).toContain('CVBuilderAdminPanel');
    expect(admin).toContain("key: 'cvBuilder'");
    expect(adminRoute).toContain('db.section.upsert');
    expect(adminRoute).toContain('CV_BUILDER_SECTION_KEY');
    expect(loader).toContain('db.section.findUnique');
    expect(publicPage).toContain('getCVBuilderConfig');
    expect(publicPage).toContain('config={cvConfig}');
    expect(pdfRoute).toContain('getCVBuilderConfig');
    expect(pdfRoute).toContain('config.features.pdfDownload');
  });
});

describe('CV Builder privacy, direct PDF, and multilingual regressions', () => {
  test('masks the CV editing subtree from Microsoft Clarity session replay', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/[lang]/cv-builder/page.tsx'), 'utf8');
    expect(page).toContain('data-clarity-mask="true"');
  });

  test('does not inject ARIA HUB contact details into applicant CV renderer', () => {
    const renderer = readFileSync(join(process.cwd(), 'src/app/[lang]/cv-builder/lib/cv-renderer.ts'), 'utf8');
    expect(renderer).not.toContain("settings?.email");
    expect(renderer).not.toContain("settings?.phone");
    expect(renderer).not.toContain("settings?.logoUrl");
  });

  test('uses direct PDF generation instead of browser print', () => {
    const client = readFileSync(join(process.cwd(), 'src/app/[lang]/cv-builder/client.tsx'), 'utf8');
    const route = readFileSync(join(process.cwd(), 'src/app/api/cv-builder/pdf/route.ts'), 'utf8');
    expect(client).not.toContain('window.print');
    expect(client).toContain("/api/cv-builder/pdf");
    expect(route).toContain('page.pdf');
    expect(route).toContain("'Content-Type':'application/pdf'");
    expect(route).toContain("'Cache-Control':'no-store");
  });

  test('ships Persian and Pashto copy for core new actions', () => {
    expect(cvText('fa', 'New CV')).not.toBe('New CV');
    expect(cvText('ps', 'New CV')).not.toBe('New CV');
    expect(cvText('fa', 'Download PDF')).not.toBe('Download PDF');
    expect(cvText('ps', 'Choose a template')).not.toBe('Choose a template');
  });
});
