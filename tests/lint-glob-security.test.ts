import { test, expect } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
test('Next ESLint root-directory glob keeps literal, wildcard, braces and array support',()=>{
 const require=createRequire(import.meta.url);
 const {getRootDirs}=require('@next/eslint-plugin-next/dist/utils/get-root-dirs');
 const root=mkdtempSync(join(tmpdir(),'aria-lint-'));
 try{
  mkdirSync(join(root,'apps','first'),{recursive:true});mkdirSync(join(root,'apps','second'),{recursive:true});
  const normalized=root.replace(/\\/g,'/');
  for(const pattern of [normalized+'/apps/*',normalized+'/apps/{first,second}']){
   expect(getRootDirs({cwd:root,settings:{next:{rootDir:pattern}}}).sort()).toEqual([normalized+'/apps/first',normalized+'/apps/second']);
  }
  expect(getRootDirs({cwd:root,settings:{next:{rootDir:[normalized+'/apps/first',normalized+'/apps/second']}}})).toHaveLength(2);
  expect(getRootDirs({cwd:root,settings:{}})).toEqual([root]);
 }finally{rmSync(root,{recursive:true,force:true});}
});
