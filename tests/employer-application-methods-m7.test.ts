import {describe,expect,test} from 'bun:test';
import {resolveEmployerApplication} from '../src/lib/employers/application-method';
describe('employer application choices stay explicit and moderated',()=>{
 test('HTTPS employer form is accepted; unsafe redirects rejected',()=>{
  expect(resolveEmployerApplication({applyMethod:'website',applyUrl:'https://jobs.example.org/apply'})).toMatchObject({
   type:'direct_application',method:'website'});
  expect(()=>resolveEmployerApplication({applyMethod:'website',applyUrl:'javascript:alert(1)'})).toThrow();
  expect(()=>resolveEmployerApplication({applyMethod:'website',applyUrl:'http://127.0.0.1/test'})).toThrow();
  expect(()=>resolveEmployerApplication({applyMethod:'website',applyUrl:'https://localhost/'})).toThrow();
 });
 test('email and phone are not conflated with WhatsApp',()=>{
  expect(resolveEmployerApplication({applyMethod:'email',applyEmail:'hr@example.org'}).url).toBe('mailto:hr@example.org');
  expect(resolveEmployerApplication({applyMethod:'phone',applyPhone:'+93 700 111 222'}).url).toBe('tel:+93700111222');
  expect(resolveEmployerApplication({applyMethod:'whatsapp',applyPhone:'+93 700 111 222'})).toEqual({
   url:'https://wa.me/93700111222',type:'whatsapp',method:'whatsapp'
  });
  expect(()=>resolveEmployerApplication({applyMethod:'whatsapp',applyPhone:'0700111222'})).toThrow();
 });
 test('in-person requires explicit address instructions and does not fabricate a URL',()=>{
  expect(resolveEmployerApplication({applyMethod:'in_person',guidelines:'Submit documents in person at Kabul City Office, Road 3.'})).toEqual({
   url:null,type:'in_person',method:'in_person'
  });
  expect(()=>resolveEmployerApplication({applyMethod:'in_person',guidelines:'Afghanistan'})).toThrow();
 });
 test('legacy employer contact validation remains supported',()=>{
  expect(resolveEmployerApplication({applyEmail:'recruiter@example.org'}).method).toBe('email');
  expect(resolveEmployerApplication({applyPhone:'+93700111222'}).method).toBe('phone');
  expect(()=>resolveEmployerApplication({})).toThrow(/application URL, email, or phone/);
 });
});
