import {describe,test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {load} from 'cheerio';
import {OfficialHtmlScraper} from '../src/lib/import/scrapers/official-html';
import {ACTED_DETAIL_CONFIG} from '../src/lib/import/scrapers/acted-config';
import {embeddedApplicationForms} from '../src/lib/application-form';
import {applicationFormEvidence,classifyOpportunityApplyUrl,classifyApplyUrl} from '../src/lib/apply';
import {resolveApplyDestination} from '../src/lib/apply-resolver';
import {preserveRepairsAndTranslations} from '../src/lib/import/preserve-repairs';

const url='https://www.acted.org/en/jobs/occupied-palestinian-territory-country-security-manager-gaza/';
const html=readFileSync(new URL('./fixtures/acted-gaza.html',import.meta.url),'utf8');
function scraper(body=html){const s=new OfficialHtmlScraper({id:'fixture',name:'Acted Vacancies',type:'job',scraperKey:'officialHtml',baseUrl:'https://www.acted.org',config:ACTED_DETAIL_CONFIG});s.fetchText=async()=>body;return s;}
describe('ACTED full vacancy extraction',()=>{
 test('all seven sections, actual email, reference and TOR link survive',async()=>{
  const result=await scraper().parseDetail({title:'Country Security Manager – Gaza',sourceUrl:url,sourceName:'Acted Vacancies'});
  for(const text of ['Acted Occupied Palestinian Territory','You will be in charge of','Expected skills and qualifications','Terms of reference','Conditions','Join us']) expect(result.description).toContain(text);
  expect(result.description!.length).toBeGreaterThan(4500);
  expect(result.description).toContain('https://www.acted.org/wp-content/uploads/2026/10/csm-opt-2026.pdf');
  expect(result.guidelines).toContain('jobs@acted.org');expect(result.guidelines).toContain('CSM/OPT');
  expect(result.requirements).toContain('Advanced proficiency in written and spoken English');
  expect(result.responsibilities).toContain('9. Ensure external representation');
  expect(result.benefits).toContain('Flight tickets');expect(result.salary).toContain('3300');
  expect(result.applyUrl).toBe(`${url}#form`);expect(result.verifiedApplicationFormUrl).toBe(result.applyUrl);
  expect(result.deadline).toBeUndefined(); // November is the start month, not a deadline.
  expect(result.country).toBe('Occupied Palestinian Territory');
 });
 test('required missing sections and blocked detail fetch fail instead of keeping partial content',async()=>{
  await expect(scraper('<section class="cpn-text">Only company introduction</section>').parseDetail({title:'Job',sourceUrl:url,sourceName:'Acted'})).rejects.toThrow('incomplete-detail');
  const s=scraper();s.fetchText=async()=>{throw new Error('HTTP 403');};
  await expect(s.parseDetail({title:'Job',sourceUrl:url,sourceName:'Acted'})).rejects.toThrow('HTTP 403');
 });
 test('newsletter, search, arbitrary fragment and POST actions cannot become a verified form',()=>{
  const $=load('<a href="#form">Apply</a><form id="form"><input type="email"><button>Subscribe</button></form><form id="search"><input type="search"></form>');
  expect(embeddedApplicationForms($,url)).toEqual([]);
  expect(classifyApplyUrl(`${url}#form`,url)).toBe('source_article_fallback');
  expect(classifyOpportunityApplyUrl({applyUrl:`${url}#form`,sourceUrl:url,applyUrlEvidence:applicationFormEvidence(`${url}#other`)})).toBe('source_article_fallback');
  const res=resolveApplyDestination({applyUrl:`${url}#form`,sourceUrl:url,sourceRole:'official_careers',verifiedApplicationFormUrl:`${url}#form`});
  expect(res.applyUrlType).toBe('application_form');expect(classifyOpportunityApplyUrl({applyUrl:res.applyUrl,sourceUrl:url,applyUrlEvidence:res.evidence})).toBe('application_form');
 });
 test('reimport keeps repaired fields and both translations, while marking changed source text for review',()=>{
  const old={description:'Old intro',descriptionI18n:{en:'Old intro',fa:'ترجمه',ps:'ژباړه'},guidelines:'Reviewed instructions',guidelinesI18n:{en:'Reviewed instructions',fa:'دستی'},translationOrigin:{fa:'MANUAL'}};
  const result=preserveRepairsAndTranslations({description:'Full vacancy',descriptionI18n:{en:'Full vacancy'},guidelines:'New scrape',guidelinesI18n:{en:'New scrape'}},old,['guidelines']);
  expect(result.guidelines).toBe(old.guidelines);expect(result.guidelinesI18n).toEqual(old.guidelinesI18n);
  expect(result.descriptionI18n).toEqual({...old.descriptionI18n,en:'Full vacancy'});expect(result.faStatus).toBe('pending');expect(result.psStatus).toBe('pending');expect(result.translationOrigin).toEqual({fa:'MANUAL_STALE'});
 });
});
