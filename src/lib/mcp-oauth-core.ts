import 'server-only';
import * as jose from 'jose';
import crypto from 'node:crypto';
import { readMcpState,putMcpState,consumeMcpNonce } from './mcp-state';
export const MCP_SCOPES={READ:'aria.translation.read',WRITE:'aria.translation.write'} as const;
export const REPAIR_SCOPES={READ:'aria.repair.read',WRITE:'aria.repair.write'} as const;
export const SUPPORTED_SCOPES=[...Object.values(MCP_SCOPES),...Object.values(REPAIR_SCOPES)];
const devSecret=crypto.randomBytes(32).toString('hex');
export function mcpBaseUrl(){return (process.env.NEXT_PUBLIC_SITE_URL||'https://www.myariahub.com').replace(/\/+$/,'');}
function secret(){const value=process.env.MCP_OAUTH_SIGNING_SECRET||process.env.ADMIN_SESSION_SECRET;if((!value||value.length<32)&&process.env.NODE_ENV==='production')throw new Error('MCP signing secret must be configured');return new TextEncoder().encode(value||devSecret);}
export function resourceForScopes(scopes:string[],supplied?:string){
  if(!scopes.length||scopes.some(s=>!SUPPORTED_SCOPES.includes(s as typeof SUPPORTED_SCOPES[number])))throw new Error('invalid_scope');
  const repair=scopes.some(s=>s.startsWith('aria.repair.'));
  if(repair&&scopes.some(s=>s.startsWith('aria.translation.')))throw new Error('invalid_scope: resources must be authorized separately');
  const resource=`${mcpBaseUrl()}/mcp/${repair?'repair':'translation'}`;if(supplied&&supplied!==resource)throw new Error('invalid_target');return resource;
}
export type RegisteredClient={client_id:string;client_secret?:string;client_name:string;redirect_uris:string[];grant_types:string[];response_types:string[];token_endpoint_auth_method:string;created_at:number};
const defaults:RegisteredClient[]=['chatgpt-mcp-client','mcp-inspector'].map(client_id=>({client_id,client_name:client_id==='mcp-inspector'?'MCP Inspector':'ChatGPT ARIA HUB',redirect_uris:['https://chatgpt.com/api/auth/oauth_callback','https://chat.openai.com/aip/oauth/callback','https://platform.openai.com/oauth/callback',...(process.env.NODE_ENV!=='production'?['http://localhost:3000/callback','http://localhost:5173/callback']:[])],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none',created_at:Date.now()}));
export async function registerClient(data:Partial<RegisteredClient>&{redirect_uris:string[]}):Promise<RegisteredClient>{
  if(!data.redirect_uris.length||data.redirect_uris.length>10||data.redirect_uris.some(raw=>{try{const u=new URL(raw);return u.hash||u.username||u.password||(u.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)));}catch{return true;}}))throw new Error('invalid_redirect_uri');
  if(data.token_endpoint_auth_method&&data.token_endpoint_auth_method!=='none')throw new Error('unsupported_auth_method');
  const client:RegisteredClient={client_id:`aria_mcp_${crypto.randomBytes(12).toString('hex')}`,client_name:(data.client_name||'ChatGPT MCP Client').slice(0,100),redirect_uris:data.redirect_uris,grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none',created_at:Date.now()};
  await putMcpState(`client:${client.client_id}`,client,new Date(Date.now()+365*86400000));return client;
}
export async function getClient(id:string):Promise<RegisteredClient|undefined>{return defaults.find(c=>c.client_id===id)||await readMcpState<RegisteredClient>(`client:${id}`);}
export function getProtectedResourceMetadata(resource:'translation'|'repair'='translation'){return {resource:`${mcpBaseUrl()}/mcp/${resource}`,authorization_servers:[mcpBaseUrl()],scopes_supported:Object.values(resource==='repair'?REPAIR_SCOPES:MCP_SCOPES),bearer_methods_supported:['header']};}
export function getAuthorizationServerMetadata(){const b=mcpBaseUrl();return {issuer:b,authorization_endpoint:`${b}/oauth/authorize`,token_endpoint:`${b}/oauth/token`,registration_endpoint:`${b}/oauth/register`,revocation_endpoint:`${b}/oauth/revoke`,response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],scopes_supported:SUPPORTED_SCOPES,token_endpoint_auth_methods_supported:['none']};}
export function verifyPkce(verifier:string,challenge:string){return /^[A-Za-z0-9._~-]{43,128}$/.test(verifier)&&/^[A-Za-z0-9_-]{43}$/.test(challenge)&&crypto.createHash('sha256').update(verifier,'ascii').digest('base64url')===challenge;}
export async function createAuthorizationCode(p:{clientId:string;redirectUri:string;scopes:string[];codeChallenge:string;codeChallengeMethod:string;resource?:string;subject?:string}){
  if(p.codeChallengeMethod!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(p.codeChallenge))throw new Error('invalid_request: PKCE S256 required');
  const resource=resourceForScopes(p.scopes,p.resource);
  return new jose.SignJWT({client_id:p.clientId,redirect_uri:p.redirectUri,scope:p.scopes.join(' '),code_challenge:p.codeChallenge,typ:'auth_code',resource}).setProtectedHeader({alg:'HS256'}).setIssuer(mcpBaseUrl()).setSubject(p.subject||'owner').setIssuedAt().setExpirationTime('5m').setJti(crypto.randomUUID()).sign(secret());
}
export async function issueTokens(clientId:string,scopes:string[],resource?:string,subject='owner'){
  const audience=resourceForScopes(scopes,resource);const common={client_id:clientId,scope:scopes.join(' '),resource:audience};
  const access_token=await new jose.SignJWT({...common,token_type:'Bearer'}).setProtectedHeader({alg:'HS256',typ:'at+jwt'}).setIssuer(mcpBaseUrl()).setAudience(audience).setSubject(subject).setIssuedAt().setExpirationTime('1h').setJti(crypto.randomUUID()).sign(secret());
  const refresh_token=await new jose.SignJWT({...common,typ:'refresh'}).setProtectedHeader({alg:'HS256'}).setIssuer(mcpBaseUrl()).setSubject(subject).setIssuedAt().setExpirationTime('30d').setJti(crypto.randomUUID()).sign(secret());
  return {access_token,refresh_token,token_type:'Bearer',expires_in:3600,scope:scopes.join(' ')};
}
async function verifyGrant(token:string){const {payload}=await jose.jwtVerify(token,secret(),{issuer:mcpBaseUrl(),algorithms:['HS256']});if(payload.jti&&await readMcpState(`revoked:${payload.jti}`))throw new Error('invalid_grant: revoked');return payload;}
export async function exchangeAuthCode(p:{code:string;codeVerifier:string;redirectUri?:string;clientId?:string;resource?:string}){
  let v:jose.JWTPayload;try{v=await verifyGrant(p.code);}catch{throw new Error('invalid_grant: invalid or expired code');}
  if(v.typ!=='auth_code'||!v.jti||!p.clientId||v.client_id!==p.clientId||!p.redirectUri||v.redirect_uri!==p.redirectUri||!verifyPkce(p.codeVerifier,String(v.code_challenge)))throw new Error('invalid_grant: code binding or PKCE mismatch');
  const scopes=String(v.scope||'').split(' ').filter(Boolean);const resource=resourceForScopes(scopes,String(v.resource||''));if(p.resource&&p.resource!==resource)throw new Error('invalid_target');
  if(!await consumeMcpNonce(`code-used:${v.jti}`,new Date(Number(v.exp)*1000)))throw new Error('invalid_grant: code already used');return issueTokens(p.clientId,scopes,resource,v.sub);
}
export async function exchangeRefreshToken(p:{refreshToken:string;clientId?:string;scopes?:string[];resource?:string}){
  let v:jose.JWTPayload;try{v=await verifyGrant(p.refreshToken);}catch{throw new Error('invalid_grant: invalid or expired refresh token');}
  if(v.typ!=='refresh'||!v.jti||!p.clientId||p.clientId!==v.client_id)throw new Error('invalid_grant: refresh client mismatch');
  const original=String(v.scope||'').split(' ').filter(Boolean);const scopes=p.scopes?.length?p.scopes:original;if(scopes.some(s=>!original.includes(s)))throw new Error('invalid_scope: refresh cannot expand access');
  const resource=resourceForScopes(original,String(v.resource||''));resourceForScopes(scopes,resource);if(p.resource&&p.resource!==resource)throw new Error('invalid_target');
  if(!await consumeMcpNonce(`revoked:${v.jti}`,new Date(Number(v.exp)*1000)))throw new Error('invalid_grant: refresh already rotated');return issueTokens(p.clientId,scopes,resource,v.sub);
}
export async function verifyMcpToken(auth:string,resource:'translation'|'repair'='translation'):Promise<{valid:boolean;clientId?:string;scopes:string[];error?:string;status?:number}>{
  try{const token=auth.replace(/^Bearer\s+/i,'').trim();if(!token)return {valid:false,scopes:[],error:'missing_token',status:401};const {payload}=await jose.jwtVerify(token,secret(),{issuer:mcpBaseUrl(),audience:`${mcpBaseUrl()}/mcp/${resource}`,algorithms:['HS256']});
    if(payload.token_type!=='Bearer'||!payload.jti||await readMcpState(`revoked:${payload.jti}`))throw new Error('invalid token');const scopes=String(payload.scope||'').split(' ').filter(Boolean);resourceForScopes(scopes,`${mcpBaseUrl()}/mcp/${resource}`);return {valid:true,clientId:String(payload.client_id||''),scopes};
  }catch{return {valid:false,scopes:[],error:'invalid_token',status:401};}
}
export async function revokeMcpToken(token:string){try{const p=await verifyGrant(token);if(p.jti)await putMcpState(`revoked:${p.jti}`,{revoked:true},new Date(Number(p.exp)*1000));}catch{/* RFC 7009: invalid tokens also succeed. */}}
export async function mintOAuthConsent(data:Record<string,unknown>,adminId:string){return new jose.SignJWT({...data,typ:'consent'}).setProtectedHeader({alg:'HS256'}).setIssuer(mcpBaseUrl()).setSubject(adminId).setIssuedAt().setExpirationTime('10m').sign(secret());}
export async function readOAuthConsent(token:string,adminId:string){const {payload}=await jose.jwtVerify(token,secret(),{issuer:mcpBaseUrl(),subject:adminId,algorithms:['HS256']});if(payload.typ!=='consent')throw new Error('invalid consent');return payload;}
