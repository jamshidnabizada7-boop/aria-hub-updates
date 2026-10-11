import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';
import { ZAIProvider } from '@/lib/ai/providers/zai';
import { EDITORIAL_PILLARS } from '@/lib/social/editorial/strategy';

export const dynamic = 'force-dynamic';
const bodySchema = z.object({
  lang: z.enum(['en','fa','ps']),
  pillar: z.enum(EDITORIAL_PILLARS.map(p=>p.id) as [string, ...string[]]),
  brief: z.string().trim().min(15).max(1200),
}).strict();

/**
 * Explicit on-demand idea generation; never executed by a background worker.
 * The brief contains only administrator-provided editorial facts.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  if (!canManageSocial(admin.role)) return NextResponse.json({ error:'Forbidden' }, { status:403 });
  const body = bodySchema.safeParse(await req.json().catch(()=>null));
  if (!body.success) return NextResponse.json({ error:'Invalid brief' }, { status:400 });
  const { lang, pillar, brief } = body.data;
  const language = lang==='fa'?'Persian (Afghanistan)':lang==='ps'?'Pashto':'English';
  const system = [
    'You are an ARIA HUB editorial assistant for students and young professionals.',
    'Return exactly three distinct, useful and original social media headline ideas.',
    `Write only in ${language}. The content pillar is ${pillar}.`,
    'Use ONLY what the brief establishes. Do NOT invent grants, guarantees, deadlines, institutions, statistics, testimonials or product features.',
    'No artificial engagement bait. No exaggerated virality claims. No unsafe medical, legal or visa guarantees.',
    'Output a JSON array of exactly three short strings, each under 115 characters. Nothing else.',
  ].join(' ');
  try {
    const output = await Promise.race([
      new ZAIProvider().chat(system, brief),
      new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('timeout')),18000)),
    ]);
    const cleaned=String(output).trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
    const parsed:unknown=JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length!==3 || !parsed.every(x=>typeof x==='string' && x.length>=8 && x.length<=115)) {
      return NextResponse.json({error:'Provider output requires manual rewriting'}, {status:502});
    }
    return NextResponse.json({ok:true,source:'ai-suggestion-only',suggestions:parsed});
  } catch {
    return NextResponse.json({error:'AI suggestion service unavailable; write a manual headline instead.'}, {status:503});
  }
}
