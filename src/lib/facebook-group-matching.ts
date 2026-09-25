export type FacebookGroupQueueSnapshot = {
  templateType: string;
  contentRef: string | null;
  contentJson: unknown;
  captionJson: unknown;
};

export function normalizeFacebookGroupMatchValue(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

export function extractGroupMatchMetadata(row: FacebookGroupQueueSnapshot) {
  const norm = normalizeFacebookGroupMatchValue;
  const c = (row.contentJson && typeof row.contentJson === 'object'
    ? row.contentJson
    : {}) as Record<string, unknown>;
  const poster = (c.posterData && typeof c.posterData === 'object'
    ? c.posterData
    : {}) as Record<string, unknown>;
  const categoryObj = (poster.category && typeof poster.category === 'object'
    ? poster.category
    : {}) as Record<string, unknown>;

  const category = norm(categoryObj.name || c.category || row.templateType);
  const country = norm(poster.country || c.country);
  const langs = Object.keys(
    row.captionJson && typeof row.captionJson === 'object'
      ? (row.captionJson as Record<string, unknown>)
      : {},
  ).map(norm);

  const kind = row.templateType === 'spotlight' ? 'opportunity' : norm(row.templateType);
  return { kind, category, country, langs };
}

export function facebookGroupRuleApplies(
  rule: {
    contentKinds: string[];
    contentCategories: string[];
    languages: string[];
    regions: string[];
  },
  meta: ReturnType<typeof extractGroupMatchMetadata>,
) {
  const norm = normalizeFacebookGroupMatchValue;
  const kinds = rule.contentKinds.map(norm);
  const categories = rule.contentCategories.map(norm);
  const languages = rule.languages.map(norm);
  const regions = rule.regions.map(norm);

  if (kinds.length && !kinds.includes(meta.kind)) return false;
  if (categories.length && !categories.some((x) => meta.category.includes(x) || x.includes(meta.category))) return false;
  if (languages.length && !languages.some((x) => meta.langs.includes(x))) return false;
  if (regions.length && meta.country && !regions.some((x) => meta.country.includes(x) || x.includes(meta.country))) return false;
  return true;
}
