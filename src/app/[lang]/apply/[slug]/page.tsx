import {notFound,redirect} from 'next/navigation';import {db} from '@/lib/db';import {currentApplicant,applicantEnabled} from '@/lib/applicant-auth';
import {JourneyShell} from '@/components/site/journey-shell';import {NativeApplicationForm} from '@/components/employers/native-application-form';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{lang:string;slug:string}>}){
 const p=await params,lang=p.lang==='fa'||p.lang==='ps'?p.lang:'en';
 const job=await db.opportunity.findFirst({where:{slug:p.slug,sourceName:'Employer',status:'published',acceptsNativeApplications:true,organizationRef:{active:true},OR:[{deadline:null},{deadline:{gte:new Date()}}]},select:{id:true,title:true,organization:true,slug:true}});
 if(!job)notFound();
 if(!applicantEnabled())notFound();const user=await currentApplicant();if(!user)redirect('/'+lang+'/login?next='+encodeURIComponent('/'+lang+'/apply/'+encodeURIComponent(job.slug))); 
 const profile=await db.applicantProfile.findUniqueOrThrow({where:{userId:user.id},select:{id:true}});
 const [documents,existing]=await Promise.all([process.env.CLOUD_CV_STORAGE_ENABLED==='true'?db.applicantDocument.findMany({where:{applicantProfileId:profile.id,status:{notIn:['storing','deleting']}},select:{id:true,originalName:true},orderBy:{createdAt:'desc'}}):[],db.employerApplication.findUnique({where:{applicantProfileId_opportunityId:{applicantProfileId:profile.id,opportunityId:job.id}},select:{id:true}})]);
 return <JourneyShell><NativeApplicationForm lang={lang} job={job} name={user.name||''} email={user.email||''} documents={documents} submitted={Boolean(existing)}/></JourneyShell>;
}
