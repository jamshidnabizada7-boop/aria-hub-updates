/** ACTED repeats cpn-text once per section; its header date is a start date, not a deadline. */
export const ACTED_DETAIL_CONFIG = {
  detailFetch: true,
  requireDetail: true,
  requiredDetailFields: ['description','responsibilities','requirements','guidelines'],
  selectors: {
    card: 'div.item.item-rh', title: 'a.title', url: 'a.title', apply: 'a.postule',
    deadline: '', country: '.jobs-header .place',
    description: 'section.cpn-text',
    responsibilities: 'section.cpn-text:has(h3:contains("You will be in charge of"))',
    requirements: 'section.cpn-text:has(h3:contains("Expected skills and qualifications"))',
    guidelines: 'section.cpn-text:has(h3:contains("Join us"))',
    benefits: 'section.cpn-text:has(h3:contains("Conditions"))',
    experience: 'section.cpn-text:has(h3:contains("Expected skills and qualifications")) li:contains("experience")',
    eligibility: 'section.cpn-text:has(h3:contains("Conditions")) li:contains("international staff position")',
    salary: 'section.cpn-text:has(h3:contains("Conditions")) li:first-child',
  },
};
