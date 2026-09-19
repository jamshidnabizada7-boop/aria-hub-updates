import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/admin-auth';

// Groq (OpenAI-compatible) via plain fetch — the `ai`/`@ai-sdk/openai` SDKs
// were referenced here but never installed, which 500'd this route on load.
const GROQ_MODEL = 'llama-3.1-8b-instant';

async function generateAdvice(system: string, prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
    }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('groq: empty completion');
  return text;
}

export async function POST(req: Request) {

  // Abuse guard: AI calls cost real money and this endpoint is public.
  const __ip = getClientIp(req as unknown as Request) || 'unknown';
  if (!rateLimit(`ai:${__ip}`, 10)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }
  try {
    const { query, lang = 'en' } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
       // Mock response for testing if no API key is available
       return NextResponse.json({ 
          advice: "<strong>Note: AI API is currently unconfigured.</strong> Based on your input, this sounds like a <strong>214(b) Immigrant Intent</strong> issue. To mitigate this, you should bring stronger evidence of your ties to your home country, such as employment records, property deeds, or family commitments." 
       });
    }

    const langInstruction =
      lang === 'fa'
        ? 'Respond in Farsi/Persian (Afghanistan). '
        : lang === 'ps'
          ? 'Respond in Pashto. '
          : 'Respond in English. ';

    const text = await generateAdvice(
      `You are an expert US Immigration consultant. A user will describe their visa rejection situation or what the officer told them.
Your job is to identify the likely rejection code (e.g., 214(b), 221(g), 212(a)(6)(C)) and provide 2-3 specific, actionable steps to mitigate it in their next interview.
${langInstruction}Format your response in simple HTML (using <strong>, <ul>, <li>) so it renders nicely in a web app. Do not include markdown formatting. Keep it under 150 words. Be empathetic but realistic.`,
      query,
    );

    return NextResponse.json({ advice: text });

  } catch (error) {
    console.error('Error generating AI rejection advice:', error);
    return NextResponse.json({ error: 'Failed to generate advice' }, { status: 500 });
  }
}
