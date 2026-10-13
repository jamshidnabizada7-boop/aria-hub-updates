import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { createAuthorizationCode,getClient,MCP_SCOPES,REPAIR_SCOPES,resourceForScopes,mintOAuthConsent,readOAuthConsent,mcpBaseUrl } from './mcp-oauth';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function GET(request:Request){
  const p=new URL(request.url).searchParams;const client=await getClient(p.get('client_id')||'');const redirectUri=p.get('redirect_uri')||'';
  const scopes=(p.get('scope')||(p.get('resource')?.endsWith('/repair')?Object.values(REPAIR_SCOPES):Object.values(MCP_SCOPES)).join(' ')).split(' ').filter(Boolean);
  if(!client||!client.redirect_uris.includes(redirectUri)||p.get('response_type')!=='code'||p.get('code_challenge_method')!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(p.get('code_challenge')||''))return NextResponse.json({error:'invalid_request'},{status:400});
  let resource:string;try{resource=resourceForScopes(scopes,p.get('resource')||undefined);}catch{return NextResponse.json({error:'invalid_scope_or_resource'},{status:400});}
  const admin=await getCurrentAdmin();
  if(admin&&!['admin','super_admin'].includes(admin.role))return NextResponse.json({error:'owner_admin_required'},{status:403});
  if(!admin)return new NextResponse('<!doctype html><html><meta name="viewport" content="width=device-width"><title>Sign in to ARIA HUB</title><body><h1>ARIA HUB administrator sign-in required</h1><p>Sign in to the admin panel in another tab, then return here and reload to authorize this ChatGPT connection.</p><a href="/admin" target="_blank" rel="noopener">Open admin sign-in</a></body></html>',{status:401,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  const consent=await mintOAuthConsent({clientId:client.client_id,redirectUri,scopes,resource,state:p.get('state')||'',codeChallenge:p.get('code_challenge')},admin.id);
  const purpose=resource.endsWith('/repair')?'Inspect opportunity sources and save validated field repairs. No publishing, deletion, applicant data or credentials.':'Read the translation queue and claim, commit or release translations. No publishing, deletion or applicant data.';
  return new NextResponse(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>Connect ARIA HUB to ChatGPT</title><style>body{font:16px system-ui;background:#10213d;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:560px;padding:32px;border:1px solid #51617a;border-radius:18px;margin:20px}button{padding:14px 22px;border-radius:10px;cursor:pointer;margin:8px;font:inherit}button[value=approve]{background:#68d8ed}</style></head><body><main class="card"><h1>Connect ARIA HUB to ChatGPT</h1><p>${esc(client.client_name)}</p><p>${esc(purpose)}</p><p>Requested permissions: ${scopes.map(esc).join(', ')}</p><form method="post" action="/oauth/authorize"><input type="hidden" name="consent" value="${esc(consent)}"><button name="action" value="deny">Cancel</button><button name="action" value="approve">Authorize connection</button></form></main></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
export async function POST(request:Request){
  if(request.headers.get('origin')!==mcpBaseUrl())return NextResponse.json({error:'invalid_origin'},{status:403});
  const admin=await getCurrentAdmin();if(!admin)return NextResponse.json({error:'admin_sign_in_required'},{status:401});
  if(!['admin','super_admin'].includes(admin.role))return NextResponse.json({error:'owner_admin_required'},{status:403});
  try{const form=await request.formData();const consent=await readOAuthConsent(String(form.get('consent')||''),admin.id);const redirect=new URL(String(consent.redirectUri));
    if(form.get('action')==='approve'){const code=await createAuthorizationCode({clientId:String(consent.clientId),redirectUri:String(consent.redirectUri),scopes:consent.scopes as string[],resource:String(consent.resource),codeChallenge:String(consent.codeChallenge),codeChallengeMethod:'S256',subject:admin.id});redirect.searchParams.set('code',code);}else redirect.searchParams.set('error','access_denied');
    if(consent.state)redirect.searchParams.set('state',String(consent.state));return NextResponse.redirect(redirect,302);
  }catch{return NextResponse.json({error:'invalid_or_expired_consent'},{status:400});}
}
