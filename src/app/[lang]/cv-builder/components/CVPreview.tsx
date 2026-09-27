'use client';

import type { CVDraft } from '../types';
import { cvRendererCss, renderCvBody } from '../lib/cv-renderer';
import { cvText } from '../lib/cv-copy';

export function CVPreview({ draft }: { draft: CVDraft }) {
  const isEmpty =
    !draft.data.personal.fullName &&
    !draft.data.personal.email &&
    !draft.data.personal.phone &&
    !draft.data.personal.summary &&
    !draft.data.experience.length &&
    !draft.data.education.length &&
    !draft.data.projects.length &&
    !draft.data.skills.length &&
    !draft.data.languages.length &&
    !draft.data.certifications.length &&
    !draft.data.awards.length &&
    !draft.data.volunteering.length &&
    !draft.data.research.length &&
    !draft.data.publications.length &&
    !draft.data.references.length;

  return (
    <div
      className={`relative mx-auto w-full overflow-hidden bg-white shadow-2xl print:shadow-none ${
        draft.paperSize === 'letter' ? 'cv-paper-letter' : 'cv-paper-a4'
      }`}
      lang={draft.outputLang}
      dir={draft.outputLang === 'en' ? 'ltr' : 'rtl'}
    >
      <style dangerouslySetInnerHTML={{ __html: cvRendererCss }} />
      {isEmpty ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-white/90 p-8 text-center text-sm text-slate-400">
          {cvText(draft.outputLang, 'Start adding your details to preview your CV.')}
        </div>
      ) : null}
      <div
        className="p-8 sm:p-10"
        dangerouslySetInnerHTML={{ __html: renderCvBody(draft) }}
      />
    </div>
  );
}
