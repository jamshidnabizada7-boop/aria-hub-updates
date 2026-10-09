import { describe, expect, test } from 'bun:test';
import { applicationPhoneUrl } from '../src/lib/employers/application-phone';
import { classifyApplyUrl, isRealApplyLink } from '../src/lib/apply';
import { applicantCookie, expiredApplicantCookie, passwordOk } from '../src/lib/applicant-auth';

describe('Milestone 1 — phone applications', () => {
 test('E.164 accepted without rewriting contact identifiers', () => {
  expect(applicationPhoneUrl('+93 700 123 456')).toBe('tel:+93700123456');
  expect(applicationPhoneUrl('+1 (202) 555-0101')).toBe('tel:+12025550101');
 });
 test('rejects ambiguous, dangerous and invalid input', () => {
  for (const value of ['0700123456','+00012345678','+9','+12345678901234567890','javascript:alert(1)','tel:+93700123456','+93 700 abc']) {
   expect(applicationPhoneUrl(value)).toBeNull();
  }
 });
 test('telephone is a real application method but not a web URL', () => {
  const type=classifyApplyUrl('tel:+93700123456',null);
  expect(type).toBe('application_phone');
  expect(isRealApplyLink(type)).toBe(true);
  expect(classifyApplyUrl('tel:0700123456',null)).toBe('unknown');
 });
});
describe('Milestone 1 — applicant cookie/password safety', () => {
 test('applicant cookies remain httpOnly and sameSite and can be revoked', () => {
  const cookie=applicantCookie('test');
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('lax');
  expect(cookie.path).toBe('/');
  expect(expiredApplicantCookie().maxAge).toBe(0);
 });
 test('rejects short and overly long new passwords', () => {
  expect(passwordOk('short')).toBe(false);
  expect(passwordOk('some secure password')).toBe(true);
  expect(passwordOk('x'.repeat(129))).toBe(false);
 });
});
