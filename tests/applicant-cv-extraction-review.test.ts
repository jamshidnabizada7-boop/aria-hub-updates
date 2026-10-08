import {describe,expect,test} from 'bun:test';
import {proposeCVFields,ExtractedCVSchema,CVReviewSchema} from '../src/lib/applicants/cv-extraction-proposals';

describe('private CV extraction suggestions require explicit review',()=>{
 test('English job CV produces evidence-backed skill and education proposals',()=>{
  const t=['Amina Ahmad','Professional Experience','Teacher at primary school','Education',
    'Bachelor of Education','Skills','Teaching and Microsoft Excel','Languages','English, Pashto'].join('\n');
  const p=proposeCVFields(t,'pdftotext');
  expect(p.requiresUserReview).toBe(true);
  expect(p.fields.education).toBe('bachelors');
  expect(p.fields.skills).toContain('Teaching');
  expect(p.fields.skills).toContain('Microsoft Excel');
  expect(p.fields.workHistory).toContain('Teacher at primary school');
  expect(p.evidence.skills?.snippet).toContain('Teaching');
  expect(ExtractedCVSchema.safeParse(p).success).toBe(true);
 });
 test('Persian and Pashto render and keep qualifications as suggestions',()=>{
  const fa=proposeCVFields('فاطمه احمد\nتحصیلات\nلیسانس\nمهارت‌ها\nتدریس و اکسل\nزبان‌ها\nفارسی و انگلیسی','tesseract');
  expect(fa.language).toBe('fa');
  expect(fa.fields.education).toBe('bachelors');
  const ps=proposeCVFields('احمد خان\nزده کړې\nلېسانس\nکاري تجربه\nښوونه د ماشومانو\nژبې\nپښتو او انګلیسي','tesseract');
  expect(ps.language).toBe('ps');
  expect(ps.fields.education).toBe('bachelors');
 });
 test('never proposes nationality, age, gender or guessed years of experience',()=>{
  const x=proposeCVFields('Ali Khan\nSkills\nDriving\nExperience\nWorked at a local transport company','docx-xml');
  expect(JSON.stringify(x.fields)).not.toMatch(/nationality|age|gender|experienceYears/);
  expect(x.requiresUserReview).toBe(true);
 });
 test('review request must name explicit fields and matching SHA hash',()=>{
  expect(CVReviewSchema.safeParse({sourceSha256:'a'.repeat(64),acceptedFields:[],edits:{}}).success).toBe(false);
  expect(CVReviewSchema.safeParse({sourceSha256:'a'.repeat(64),acceptedFields:['skills'],edits:{skills:['Teaching']}}).success).toBe(true);
  expect(CVReviewSchema.safeParse({sourceSha256:'f'.repeat(63),acceptedFields:['skills'],edits:{skills:['Teaching']}}).success).toBe(false);
  expect(CVReviewSchema.safeParse({sourceSha256:'a'.repeat(64),acceptedFields:['nationality'],edits:{}}).success).toBe(false);
  expect(CVReviewSchema.safeParse({sourceSha256:'a'.repeat(64),acceptedFields:['skills'],edits:{skills:['x'.repeat(90)]}}).success).toBe(false);
 });
 test('no fabricated dates or schools in typed extraction result',()=>{
  const p=proposeCVFields('Sarah Lee\nWork experience\nAccountant at NGO\nEducation\nBachelor in Commerce','pdftotext');
  expect(JSON.stringify(p)).not.toMatch(/dateOfBirth|graduationYear|universityOf|admissionProbability/);
  expect(p.fields.educationHistory?.[0]).toContain('Bachelor');
 });
});
