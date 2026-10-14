import {test,expect} from 'bun:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LangProvider} from '../src/components/site/lang-context';
import {ProcessSection} from '../src/components/site/sections/process';
const titles={en:'English process step',fa:'گام فارسی',ps:'پښتو ګام'};
const step={id:'locale-test',title:titles.en,titleI18n:titles,description:'English description',descriptionI18n:{en:'English description',fa:'تشریح فارسی',ps:'پښتو تشریح'},icon:'Check',order:1,status:'published'};
for(const lang of ['en','fa','ps'] as const)test('CMS process content uses '+lang+' route during server rendering',()=>{
 const html=renderToStaticMarkup(createElement(LangProvider,{lang,children:createElement(ProcessSection,{steps:[step]})}));
 expect(html).toContain(titles[lang]);
 for(const other of ['en','fa','ps'] as const)if(other!==lang)expect(html).not.toContain(titles[other]);
});
