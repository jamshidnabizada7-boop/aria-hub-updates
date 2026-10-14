/** Run on Oracle under systemd EnvironmentFile loading. Read-only by default.
 * Installs the existing system-user credential privately, never prints secrets,
 * never sends a message, never enables billable templates or adds billing.
 */
import {db} from '../src/lib/db';
import {decryptCredentials,encryptCredentials} from '../src/lib/social/credentials';
import {mkdir,writeFile,readFile,chmod,chown} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const apply=process.argv.includes('--apply');
async function main(){
 const row=await db.publishChannel.findUniqueOrThrow({where:{platform:'whatsapp'}});
 const credentials=decryptCredentials(row.credentials),token=String(credentials.accessToken||'');
 if(!token||!/^[A-Za-z0-9_.|:-]+$/.test(token))throw Error('credential_unavailable');
 const headers={Authorization:'Bearer '+token};
 const phoneId='391497570703612',wabaId='371350886051089',number='93700876806';
 const response=await fetch('https://graph.facebook.com/v26.0/'+phoneId+'?fields=id,display_phone_number,verified_name',
  {headers,signal:AbortSignal.timeout(15000)});
 const phone=await response.json();
 if(!response.ok||phone.id!==phoneId||String(phone.display_phone_number).replace(/\D/g,'')!==number||phone.verified_name==='Test Number')throw Error('real_sender_identity_failed');
 const templateResponse=await fetch('https://graph.facebook.com/v26.0/'+wabaId+'/message_templates?fields=name,status,language,category',
  {headers,signal:AbortSignal.timeout(15000)});
 const templates=await templateResponse.json();
 if(!templateResponse.ok||!templates.data?.some((t:{name:string;status:string;language:string})=>t.name==='aria_opportunity_alert_v1'&&t.status==='APPROVED'&&t.language==='en_US'))throw Error('real_sender_template_failed');
 if(!apply){console.log(JSON.stringify({status:'validated',realSender:true,approvedMatchTemplate:true,zeroSpend:true,billableSends:false,inboundActivation:false}));return;}
 const path='/etc/aria-hub/whatsapp-free.env';
 const previous=await readFile(path,'utf8').catch(()=>null);
 // Re-running cannot accidentally erase an already installed webhook secret.
 if(previous)throw Error('connection_file_exists_review_required');
 const backup='/opt/aria-hub/private/social-reconnect/whatsapp-real-sender-'+Date.now()+'.json';
 await mkdir('/opt/aria-hub/private/social-reconnect',{recursive:true,mode:0o700});
 await writeFile(backup,JSON.stringify({id:row.id,credentials:row.credentials,enabled:row.enabled}),{mode:0o600,flag:'wx'});
 const env=['WHATSAPP_ZERO_SPEND=true','WHATSAPP_BILLABLE_SENDS_ENABLED=false',
  'APPLICANT_WHATSAPP_DELIVERY_ENABLED=false','APPLICANT_WHATSAPP_VERIFICATION_ENABLED=false','APPLICANT_WHATSAPP_INBOUND_ENABLED=false',
  'WHATSAPP_PHONE_NUMBER_ID='+phoneId,'WHATSAPP_BUSINESS_ACCOUNT_ID='+wabaId,'WHATSAPP_BUSINESS_NUMBER='+number,
  'WHATSAPP_META_ACCESS_TOKEN='+token,'WHATSAPP_MATCH_TEMPLATE=aria_opportunity_alert_v1','WHATSAPP_TEMPLATE_LANG_EN=en_US',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN='+randomBytes(32).toString('hex')].join('\n')+'\n';
 await writeFile(path,env,{mode:0o640,flag:'wx'});await chmod(path,0o640);
 // Existing environment files use root:ariahub. Resolve the group from them.
 const {stat}=await import('node:fs/promises');const owner=await stat('/etc/aria-hub/applicant.env');await chown(path,0,owner.gid);
 await db.$transaction([
  db.publishChannel.update({where:{id:row.id},data:{enabled:false,credentials:encryptCredentials({...credentials,phoneNumberId:phoneId,mode:'individual'}),lastError:'Strict zero spend: scheduled social sends disabled; free private replies require live signed inbound webhook activation.'}}),
  db.auditLog.create({data:{action:'whatsapp_real_sender_prepared',entity:'PublishChannel',entityId:row.id,details:JSON.stringify({realSender:true,zeroSpend:true,billableSends:false,inboundActivation:false,backup})}})
 ]);
 console.log(JSON.stringify({status:'installed_inactive',realSender:true,zeroSpend:true,billableSends:false,backup,environmentFile:path}));
}
main().catch(()=>{console.error('WhatsApp installation failed; inspect privately before retrying.');process.exitCode=1;}).finally(()=>db.$disconnect());
