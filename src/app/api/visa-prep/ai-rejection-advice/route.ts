import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/admin-auth';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// We use the Groq API key from environment since it's the fastest and highest limit.
// Fallback to OpenAI format if needed
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
});

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
        ? 'Respond in Dari/Persian (Afghanistan). '
        : lang === 'ps'
          ? 'Respond in Pashto. '
          : 'Respond in English. ';

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: `You are an expert US Immigration consultant. A user will describe their visa rejection situation or what the officer told them. 
Your job is to identify the likely rejection code (e.g., 214(b), 221(g), 212(a)(6)(C)) and provide 2-3 specific, actionable steps to mitigate it in their next interview.
${langInstruction}Format your response in simple HTML (using <strong>, <ul>, <li>) so it renders nicely in a web app. Do not include markdown formatting like \`\`\`html. Keep it under 150 words. Be empathetic but realistic.`,
      prompt: query,
    });

    return NextResponse.json({ advice: text });

  } catch (error) {
    console.error('Error generating AI rejection advice:', error);
    return NextResponse.json({ error: 'Failed to generate advice' }, { status: 500 });
  }
}
