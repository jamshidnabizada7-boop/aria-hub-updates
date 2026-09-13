import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/admin-auth';

export async function POST(request: Request) {

  // Abuse guard: AI calls cost real money and this endpoint is public.
  const __ip = getClientIp(request as unknown as Request) || 'unknown';
  if (!rateLimit(`ai:${__ip}`, 10)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }
  try {
    const { transcript, questionText } = await request.json();

    if (!transcript || !questionText) {
      return NextResponse.json({ error: 'Missing transcript or questionText' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const prompt = `
You are an expert scholarship interview coach. Evaluate the following interview response based on the question asked.
Question: "${questionText}"
Candidate's Response: "${transcript}"

Provide a JSON output evaluating the candidate's response. Include the following fields:
- confidenceScore: integer (0-100) based on confidence indicators, hesitation (um, uh).
- contentStrengthScore: integer (0-100) based on flow, structure, relevance, vocabulary, and grammar.
- overallFeedback: string (2-3 sentences of constructive feedback, what was good, what to improve).
- tipsForImprovement: array of strings (1-3 actionable tips).
- idealAnswer: string (An example of a perfect, highly-professional answer to this question).

Return ONLY valid JSON without any markdown formatting.
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API Error:', errorText);
      return NextResponse.json({ error: 'Failed to process AI evaluation' }, { status: 500 });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Evaluate API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
