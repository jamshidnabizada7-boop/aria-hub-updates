import type { CheerioAPI } from 'cheerio';

/** Decode addresses that the public page's Cloudflare email script displays. */
export function decodeProtectedEmails($: CheerioAPI): void {
  $('[data-cfemail]').each((_, el) => {
    const hex = $(el).attr('data-cfemail') || '';
    if (!/^(?:[a-f0-9]{2}){4,}$/i.test(hex)) return;
    const key = parseInt(hex.slice(0, 2), 16);
    let email = '';
    for (let i = 2; i < hex.length; i += 2) email += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) return;
    $(el).text(email);
    if (el.tagName === 'a') $(el).attr('href', `mailto:${email}`);
  });
}

export interface EmbeddedApplicationForm { url: string; label: string }

/** Inspect actual applicant fields, not an arbitrary #form link or POST endpoint. */
export function embeddedApplicationForms($: CheerioAPI, pageUrl: string): EmbeddedApplicationForm[] {
  const forms: EmbeddedApplicationForm[] = [];
  $('form').each((_, el) => {
    const form = $(el);
    const fields = form.find('input,textarea,select');
    const names = fields.map((_, field) => `${$(field).attr('name') || ''} ${$(field).attr('id') || ''}`).get().join(' ');
    const hasCv = form.find('input[type="file"]').toArray().some(field => /\bcv\b|resume|curriculum/i.test(`${$(field).attr('name') || ''} ${$(field).attr('id') || ''}`.replace(/[_-]/g, ' ')));
    if (!hasCv || !form.find('input[type="email"]').length || !/first.?name|last.?name|full.?name|your.?name|applicant/i.test(names)) return;
    if (!form.find('input[type="submit"],button[type="submit"],button:not([type])').length) return;
    // Stable visible anchors only. Do not expose hidden inputs, tokens, action
    // endpoints or a newsletter/search form as an application destination.
    const containers = form.parents('[id]').toArray();
    const ids = [form.attr('id'), ...containers.map(parent => $(parent).attr('id'))].filter((id): id is string => !!id);
    const anchors = [...new Set([ids.find(id => /^(?:form|apply|application)$/i.test(id)), ids[0]].filter((id): id is string => !!id))];
    for (const id of anchors) {
      const url = new URL(pageUrl); url.hash = id;
      forms.push({ url: url.href, label: 'Application form (CV upload)' });
    }
  });
  return forms;
}

