import {notFound,redirect} from 'next/navigation';
import {isLang} from '@/lib/lang-route';
import {currentApplicant} from '@/lib/applicant-auth';
import {getCVBuilderConfig} from '@/lib/cv-builder-config.server';
import {CVBuilderClient} from '@/app/[lang]/cv-builder/client';
import type {CVPurpose, CVOutputLang} from '@/app/[lang]/cv-builder/types';

export const dynamic='force-dynamic';

export default async function CVBuilderPreview({params,searchParams}:{
 params:Promise<{lang:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>;
}){
 const {lang:raw}=await params;
 if(!isLang(raw))notFound();
 if(!(await currentApplicant()))redirect('/'+raw+'/login');
 const [config,query]=await Promise.all([getCVBuilderConfig(),searchParams]);
 if(!config.enabled)notFound();
 const requested=query.purpose;
 const allowed:CVPurpose[]=['professional','student','scholarship'];
 const purpose:CVPurpose=typeof requested==='string' && allowed.includes(requested as CVPurpose) && config.purposes[requested as CVPurpose].enabled ? requested as CVPurpose : config.defaultPurpose;
 const contextSlug=typeof query.opportunity==='string'?query.opportunity.slice(0,180):undefined;
 const contextTitle=typeof query.title==='string'?query.title.slice(0,180):undefined;
 const originalReturn=typeof query.returnTo==='string'?query.returnTo:undefined;
 const returnTo=originalReturn?.startsWith('/'+raw+'/')&&!originalReturn.startsWith('//') ? originalReturn:undefined;
 return <main id="main-content" className="aria-tool-content aria-cv-builder-preview">
   <div data-clarity-mask="true">
    <CVBuilderClient
      initialLang={raw as CVOutputLang}
      initialPurpose={purpose}
      initialTemplatesOpen={query.templates==='1'}
      config={config}
      source={contextSlug||contextTitle||returnTo ? {opportunitySlug:contextSlug,opportunityTitle:contextTitle,returnTo}:undefined}
    />
   </div>
 </main>;
}
