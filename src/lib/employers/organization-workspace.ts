import 'server-only';
import type {PrismaClient} from '@prisma/client';
import {isSafePublicUrl} from '@/lib/security/url-guard';
import {slugify} from '@/lib/import/utils';
import {requireMembership} from './membership';
import sharp from 'sharp';

export const INDUSTRIES=['Agriculture','Banking / Finance','Construction','Education','Energy','Government','Healthcare','Humanitarian / NGO','Information Technology','Logistics','Manufacturing','Media','Professional Services','Retail','Telecommunications','Other'] as const;
function text(value:unknown,max:number){return String(value??'').trim().slice(0,max);}
export async function organizationInput(body:Record<string,unknown>){
 const name=text(body.name,160),industry=text(body.industry,100),country=text(body.country,100),description=text(body.description,6000);
 if(name.length<2)throw Error('Enter an organization name of at least 2 characters.');
 if(!INDUSTRIES.includes(industry as typeof INDUSTRIES[number]))throw Error('Choose an industry.');
 const website=text(body.website,500),careersUrl=text(body.careersUrl,500);
 for(const url of [website,careersUrl])if(url&&(!url.startsWith('https://')||!isSafePublicUrl(url)))throw Error('Use a public HTTPS website.');
 let logoUrl:string|undefined;
 if(body.logoData){
  const data=String(body.logoData);
  if(!/^data:image\/(png|jpeg|webp);base64,/.test(data)||data.length>750000)throw Error('Upload a PNG, JPG or WebP logo below 500 KB.');
  const bytes=Buffer.from(data.split(',')[1],'base64');
  const png=await sharp(bytes,{limitInputPixels:16_000_000}).rotate().resize(256,256,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
  if(png.length>200000)throw Error('Choose a simpler logo.');
  logoUrl='data:image/png;base64,'+png.toString('base64');
 }
 return {name,industry,country:country||null,description:description||null,website:website||null,careersUrl:careersUrl||null,...(logoUrl?{logoUrl}:{})};
}
export async function registerOrganization(db:PrismaClient,userId:string,body:Record<string,unknown>){
 const data=await organizationInput(body);
 return db.$transaction(async tx=>{
  // Serialize registrations by this account to prevent duplicate concurrent submissions.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  const pending=await tx.organizationMember.count({where:{userId,status:'pending'}});
  if(pending>=3)throw Error('Your registration is awaiting review. Check your pending requests.');
  const existing=await tx.organization.findFirst({where:{name:{equals:data.name,mode:'insensitive'}},select:{slug:true}});
  if(existing)throw Error('This organization already exists. Request access using its slug: '+existing.slug);
  const base=slugify(data.name).slice(0,100)||'organization';
  const suffix=crypto.randomUUID().slice(0,8);
  const org=await tx.organization.create({data:{...data,slug:base+'-'+suffix,active:false,verified:false,verificationMethod:'employer_registration_pending'}});
  const user=await tx.user.findUniqueOrThrow({where:{id:userId},select:{email:true}});
  await tx.organizationMember.create({data:{userId,organizationId:org.id,role:'owner',status:'pending',claimEmail:user.email}});
  await tx.auditLog.create({data:{entity:'organization',entityId:org.id,action:'employer.organization-register',details:JSON.stringify({userId})}});
  return {id:org.id,slug:org.slug,status:'pending'};
 });
}
export async function editOrganization(db:PrismaClient,userId:string,id:string,body:Record<string,unknown>){
 if(!await requireMembership(db,userId,id,'owner'))throw Error('Owner access required.');
 const data=await organizationInput(body);
 // Identity/domain changes require admin review. Established identity cannot be overwritten by a compromised recruiter.
 const org=await db.organization.findUniqueOrThrow({where:{id},select:{name:true,website:true,careersUrl:true,description:true}});
 if(data.name!==org.name||data.website!==org.website)throw Error('Contact ARIA HUB to change the organization name or official website.');
 await db.$transaction(async tx=>{
  await tx.organization.update({where:{id},data:{industry:data.industry,country:data.country,description:data.description,careersUrl:data.careersUrl,...(data.logoUrl?{logoUrl:data.logoUrl}:{}),
   ...(data.description!==org.description?{descriptionI18n:{}}:{})}});
  await tx.auditLog.create({data:{entity:'organization',entityId:id,action:'employer.organization-edit',details:JSON.stringify({userId,fields:['industry','country','description','careersUrl',...(data.logoUrl?['logo']:[])]})}});
 });
}
