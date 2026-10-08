import {wordDocumentXmlToText} from '../src/lib/applicants/cv-docx-text';
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

describe('CV extraction regressions: document structure and RTL',()=>{
 test('DOCX WordprocessingML preserves adjacent inline runs and table cells',()=>{
  const xml='<?xml version="1.0"?><w:document><w:body>'+
   '<w:p><w:r><w:t>Fati</w:t></w:r><w:r><w:t>ma Ahmad</w:t></w:r></w:p>'+
   '<w:p><w:r><w:t>Teaching &amp; Accounting</w:t></w:r></w:p>'+
   '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Excel</w:t></w:r></w:p></w:tc>'+
   '<w:tc><w:p><w:r><w:t>Pashto</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'+
   '</w:body></w:document>';
  const text=wordDocumentXmlToText(xml);
  expect(text).toContain('Fatima Ahmad');
  expect(text).toContain('Teaching & Accounting');
  expect(text).toContain('Excel');
  expect(text).toContain('Pashto');
  expect(text).not.toContain('Fati ma');
  expect(()=>wordDocumentXmlToText('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]>')).toThrow('unsafe_docx_xml');
 });
 test('Persian section boundaries do not mix employment and degrees',()=>{
  const p=proposeCVFields('فاطمه احمد\\nتحصیلات\\nلیسانس دانشگاه کابل\\nتجربه کاری\\nآموزگار در مکتب\\nمهارت ها\\nتدریس\\nزبان ها: فارسی و انگلیسی','docx-xml');
  expect(p.language).toBe('fa');
  expect(p.fields.educationHistory).toEqual(['لیسانس دانشگاه کابل']);
  expect(p.fields.workHistory).toEqual(['آموزگار در مکتب']);
  expect(p.fields.languages).toEqual(['English','Persian']);
 });
 test('Pashto section boundaries and inline languages remain distinct',()=>{
  const p=proposeCVFields('احمد خان\\nزده کړې\\nلېسانس د کابل پوهنتون\\nکاري تجربه\\nښوونکی په ښوونځي کې\\nژبې: پښتو او انګلیسي\\nسندونه\\nد ښوونې تصدیق','tesseract');
  expect(p.language).toBe('ps');
  expect(p.fields.educationHistory).toEqual(['لېسانس د کابل پوهنتون']);
  expect(p.fields.workHistory).toEqual(['ښوونکی په ښوونځي کې']);
  expect(p.fields.languages).toEqual(['Pashto','English']);
  expect(p.fields.certifications).toEqual(['د ښوونې تصدیق']);
 });
 test('never treats the next section heading as an invented qualification',()=>{
  const p=proposeCVFields('Sarah Lee\\nEducation\\nBachelor of Education\\nSkills\\nMicrosoft Word\\nCertifications\\nTeacher Training','pdftotext');
  expect(p.fields.educationHistory).toEqual(['Bachelor of Education']);
  expect(p.fields.certifications).toEqual(['Teacher Training']);
 });
});
