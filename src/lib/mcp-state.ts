import 'server-only';
import { db } from './db';
import type { Prisma } from '@prisma/client';
type Executor = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;
export async function readMcpState<T>(key:string,executor:Executor=db):Promise<T|undefined> {
  const rows=await executor.$queryRaw<{data:T}[]>`SELECT data FROM "McpSecurityState" WHERE key = ${key} AND "expiresAt" > now()`;return rows[0]?.data;
}
export async function putMcpState(key:string,data:unknown,expiresAt:Date,executor:Executor=db):Promise<void> {
  await executor.$executeRaw`DELETE FROM "McpSecurityState" WHERE key IN (SELECT key FROM "McpSecurityState" WHERE "expiresAt" < now() LIMIT 100)`;
  await executor.$executeRaw`INSERT INTO "McpSecurityState" (key,data,"expiresAt") VALUES (${key},${JSON.stringify(data)}::jsonb,${expiresAt}) ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data,"expiresAt"=EXCLUDED."expiresAt"`;
}
export async function consumeMcpNonce(key:string,expiresAt:Date):Promise<boolean> {
  const n=await db.$executeRaw`INSERT INTO "McpSecurityState" (key,data,"expiresAt") VALUES (${key},'{}'::jsonb,${expiresAt}) ON CONFLICT (key) DO NOTHING`;return n===1;
}
