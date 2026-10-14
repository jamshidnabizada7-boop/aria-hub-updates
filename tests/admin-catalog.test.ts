import {test,expect} from 'bun:test';
import {ADMIN_WORKSPACES,canonicalAdminPanel,adminWorkspaceFor,HOMEPAGE_KEYS,READ_ONLY_ADMIN_MODELS} from '../src/lib/admin-catalog';
import {readFileSync} from 'node:fs';
test('every existing admin shortcut has one reachable workspace, including retired aliases',()=>{
 const source=readFileSync(new URL('../src/app/admin/admin-app.tsx',import.meta.url),'utf8');
 const nav=source.slice(source.indexOf('const NAV:'),source.indexOf('export function AdminApp'));
 const keys=[...nav.matchAll(/key: '([^']+)'/g)].map(m=>m[1]);
 for(const key of keys)expect(adminWorkspaceFor(key),key).toBeDefined();
 const panels=ADMIN_WORKSPACES.flatMap(w=>[...w.panels]);expect(new Set(panels).size).toBe(panels.length);
 expect(canonicalAdminPanel('socialKit')).toBe('brandStudio');expect(canonicalAdminPanel('counter')).toBe('section');
});
test('worker ledgers and user activity cannot be edited as CMS content',()=>{
 for(const key of ['counter','importRun','interviewSession','templateRating','templateBookmark'])expect(READ_ONLY_ADMIN_MODELS.has(key)).toBe(true);
 expect(READ_ONLY_ADMIN_MODELS.has('documentTemplate')).toBe(false);expect(HOMEPAGE_KEYS.has('cvBuilder')).toBe(false);
});
