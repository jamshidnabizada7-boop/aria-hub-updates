'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CVDraft, CVOutputLang, CVPurpose, PaperSize, SaveStatus, TemplateType } from '../types';
import { createDraft, normalizeDraft } from '../lib/cv-utils';
import {
  deleteDraft as deletePersistedDraft,
  loadDrafts,
  readActiveDraftId,
  saveDraft,
  writeActiveDraftId,
  writeSynchronousSnapshot,
} from '../lib/cv-persistence';

interface InitialContext {
  purpose?: CVPurpose;
  outputLang?: CVOutputLang;
  source?: CVDraft['source'];
  template?: TemplateType;
  paperSize?: PaperSize;
}

export function useCVDrafts(initial: InitialContext) {
  const [drafts, setDrafts] = useState<CVDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState('');
  const [status, setStatus] = useState<SaveStatus>('loading');
  const initialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadDrafts();
      if (cancelled) return;
      let next = stored;
      let active = readActiveDraftId();
      if (!next.length) {
        const fresh = createDraft(initial.purpose || 'professional', initial.outputLang || 'en', initial.source, { template: initial.template, paperSize: initial.paperSize });
        next = [fresh];
        active = fresh.id;
      }
      if (!active || !next.some((draft) => draft.id === active)) active = next[0].id;
      setDrafts(next);
      setActiveDraftId(active);
      writeActiveDraftId(active);
      setStatus('saved');
      initialized.current = true;
    })();
    return () => { cancelled = true; };
  }, [initial.outputLang, initial.paperSize, initial.purpose, initial.source, initial.template]);

  const activeDraft = useMemo(
    () => drafts.find((draft) => draft.id === activeDraftId) || drafts[0] || null,
    [drafts, activeDraftId],
  );

  useEffect(() => {
    if (!initialized.current || !activeDraft) return;
    writeSynchronousSnapshot(activeDraft);
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveDraft(activeDraft);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 450);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [activeDraft]);

  useEffect(() => {
    const onPageHide = () => { if (activeDraft) writeSynchronousSnapshot(activeDraft); };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [activeDraft]);

  const updateActive = useCallback((updater: (draft: CVDraft) => CVDraft) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== activeDraftId) return draft;
        const next = normalizeDraft(updater(draft));
        return next ? { ...next, updatedAt: new Date().toISOString() } : draft;
      }),
    );
  }, [activeDraftId]);

  const createNewDraft = useCallback((purpose: CVPurpose, outputLang: CVOutputLang, source?: CVDraft['source'], options?: { template?: TemplateType; paperSize?: PaperSize }) => {
    const fresh = createDraft(purpose, outputLang, source, options);
    setDrafts((current) => [fresh, ...current]);
    setActiveDraftId(fresh.id);
    writeActiveDraftId(fresh.id);
    return fresh.id;
  }, []);

  const duplicateActive = useCallback(() => {
    if (!activeDraft) return null;
    const duplicate: CVDraft = {
      ...activeDraft,
      id: createDraft(activeDraft.purpose, activeDraft.outputLang).id,
      name: activeDraft.name ? `${activeDraft.name} copy` : '',
      source: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDrafts((current) => [duplicate, ...current]);
    setActiveDraftId(duplicate.id);
    writeActiveDraftId(duplicate.id);
    return duplicate.id;
  }, [activeDraft]);

  const switchDraft = useCallback((id: string) => {
    setActiveDraftId(id);
    writeActiveDraftId(id);
  }, []);

  const removeDraft = useCallback(async (id: string) => {
    await deletePersistedDraft(id);
    setDrafts((current) => {
      const remaining = current.filter((draft) => draft.id !== id);
      if (!remaining.length) {
        const fresh = createDraft(initial.purpose || 'professional', initial.outputLang || 'en', initial.source, { template: initial.template, paperSize: initial.paperSize });
        setActiveDraftId(fresh.id);
        writeActiveDraftId(fresh.id);
        return [fresh];
      }
      if (id === activeDraftId) {
        setActiveDraftId(remaining[0].id);
        writeActiveDraftId(remaining[0].id);
      }
      return remaining;
    });
  }, [activeDraftId, initial.outputLang, initial.paperSize, initial.purpose, initial.source, initial.template]);

  // Only invoked by an explicit user click to import a private cloud version.
  // Guest/local draft persistence remains the default.
  const importCloudDraft=useCallback((raw:CVDraft)=>{
    const draft=normalizeDraft(raw);if(!draft)return false;
    setDrafts(current=>[draft,...current.filter(x=>x.id!==draft.id)]);
    setActiveDraftId(draft.id);writeActiveDraftId(draft.id);
    return true;
  },[]);
  return { drafts, activeDraft, activeDraftId, status, updateActive, createNewDraft, duplicateActive, switchDraft, removeDraft, importCloudDraft };
}
