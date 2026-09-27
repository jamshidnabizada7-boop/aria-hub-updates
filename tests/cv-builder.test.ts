import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDraft, normalizeDraft, safeExternalUrl } from '../src/app/[lang]/cv-builder/lib/cv-utils';
import { getRecommendedSections, validateDraft } from '../src/app/[lang]/cv-builder/lib/cv-validation';
import { cvText } from '../src/app/[lang]/cv-builder/lib/cv-copy';

describe('CV Builder draft model', () => {
  test('creates a versioned purpose-aware draft', () => {
    const professional = createDraft('professional', 'en');
    const scholarship = createDraft('scholarship', 'fa');
    expect(professional.schemaVersion).toBe(3);
    expect(professional.template).toBe('ats');
    expect(scholarship.template).toBe('academic');
    expect(scholarship.outputLang).toBe('fa');
  });

  test('migrates the legacy CV shape and internal enum labels', () => {
    const migrated = normalizeDraft({
      personal: {
        fullName: 'Test User',
        linkedIn: 'https://linkedin.com/in/test',
        gender: 'Male',
      },
      skills: [{ id: 's1', name: 'Python', level: 'Expert' }],
      languages: [{ id: 'l1', name: 'English', proficiency: 'Fluent' }],
      education: [],
      experience: [],
      certifications: [],
      projects: [],
      references: [],
    });
    expect(migrated).not.toBeNull();
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

describe('CV Builder readiness', () => {
  test('blocks export for a blank draft', () => {
    const readiness = validateDraft(createDraft('professional', 'en'));
    expect(readiness.canExport).toBe(false);
    expect(readiness.issues.some((issue) => issue.id === 'full-name-required')).toBe(true);
    expect(readiness.issues.some((issue) => issue.id === 'content-required')).toBe(true);
  });

  test('detects invalid date ordering and unsafe links', () => {
    const draft = createDraft('student', 'en');
    draft.data.personal.fullName = 'Student';
    draft.data.personal.email = 'student@example.com';
    draft.data.education.push({
      id: 'edu1',
      degree: 'BS',
      institution: 'University',
      location: '',
      startDate: '2026-09',
      endDate: '2025-06',
      isCurrent: false,
      description: '',
    });
    draft.data.projects.push({
      id: 'p1',
      name: 'Project',
      role: '',
      startDate: '',
      endDate: '',
      description: 'Built a project',
      link: 'javascript:alert(1)',
      technologies: '',
    });
    const readiness = validateDraft(draft);
    expect(readiness.canExport).toBe(false);
    expect(readiness.issues.some((issue) => issue.id === 'education-date-edu1')).toBe(true);
    expect(readiness.issues.some((issue) => issue.id === 'project-url-p1')).toBe(true);
  });

  test('allows a minimally substantive valid CV to export', () => {
    const draft = createDraft('professional', 'en');
    draft.data.personal.fullName = 'Candidate';
    draft.data.personal.email = 'candidate@example.com';
    draft.data.experience.push({
      id: 'e1',
      role: 'Developer',
      company: 'Example',
      location: 'Remote',
      startDate: '2025-01',
      endDate: '',
      isCurrent: true,
      description: 'Built and maintained user-facing features.',
    });
    const readiness = validateDraft(draft);
    expect(readiness.canExport).toBe(true);
  });

  test('purpose-specific recommendations include academic and student content', () => {
    const academic = createDraft('scholarship', 'en');
    const student = createDraft('student', 'en');
    expect(getRecommendedSections(academic)).toContain('research');
    expect(getRecommendedSections(academic)).toContain('publications');
    expect(getRecommendedSections(student)).toContain('volunteering');
    expect(getRecommendedSections(student)).toContain('projects');
  });
});


describe('CV Builder privacy and multilingual regressions', () => {
  test('masks the CV editing subtree from Microsoft Clarity session replay', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/[lang]/cv-builder/page.tsx'), 'utf8');
    expect(page).toContain('data-clarity-mask="true"');
  });

  test('does not print ARIA HUB contact details into the applicant CV renderer', () => {
    const preview = readFileSync(join(process.cwd(), 'src/app/[lang]/cv-builder/components/CVPreview.tsx'), 'utf8');
    expect(preview).not.toContain('PrintFooter');
    expect(preview).not.toContain("settings?.email");
    expect(preview).not.toContain("settings?.phone");
    expect(preview).not.toContain("settings?.logoUrl");
  });

  test('ships native Persian and Pashto editor copy for core actions', () => {
    expect(cvText('fa', 'New CV')).not.toBe('New CV');
    expect(cvText('ps', 'New CV')).not.toBe('New CV');
    expect(cvText('fa', 'Review & export')).not.toBe('Review & export');
    expect(cvText('ps', 'Personal information')).not.toBe('Personal information');
  });
});
