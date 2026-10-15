import {test,expect} from 'bun:test';import {applicantReturnPath} from '../src/lib/applicants/navigation';
test('native application return preserves locale and rejects open redirects/path traversal',()=>{
 expect(applicantReturnPath('/en/apply/project-coordinator','en')).toBe('/en/apply/project-coordinator');
 expect(applicantReturnPath('/fa/apply/'+encodeURIComponent('وظیفه'),'fa')).toBe('/fa/apply/'+encodeURIComponent('وظیفه'));
 for(const path of ['https://attacker.example','//attacker.example','/en/apply/../admin','/en/apply/%2e%2e%2fadmin','/en/apply/test?next=https://attacker.example','/en/apply/test#fragment','/en/apply/%','/fa/apply/another-locale','/en/apply/a%5cb'])expect(applicantReturnPath(path,'en')).toBe('/en/portal');
});
