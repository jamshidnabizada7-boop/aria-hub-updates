import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/admin-auth';

export async function POST(request: Request) {

  // Abuse guard: AI calls cost real money and this endpoint is public.
  const __ip = getClientIp(request as unknown as Request) || 'unknown';
  if (!rateLimit(`ai:${__ip}`, 10)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }
  try {
    const { targetCountry, visaType, difficulty, currentIndex, previousQuestions } = await request.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const previousQContext = previousQuestions && previousQuestions.length > 0 
      ? `Previous questions you have already asked in this session:\n${previousQuestions.map((q: string, i: number) => `${i+1}. ${q}`).join('\n')}\nDO NOT repeat these questions.` 
      : 'This is the first question of the interview.';

    let officerPersona = "You are a professional but fair Consular Officer.";
    if (difficulty === "hard") {
      officerPersona = "You are a very strict, skeptical, and fast-paced Consular Officer looking for any red flags (immigrant intent, lack of ties). Ask very direct and tough questions.";
    } else if (difficulty === "easy") {
      officerPersona = "You are a friendly and welcoming Consular Officer asking basic, straightforward questions.";
    }

    const prompt = `
${officerPersona}
You are conducting a visa interview for an applicant applying for a ${visaType || 'visa'} to ${targetCountry || 'your country'}.
This is question number ${currentIndex + 1} of the interview.

${previousQContext}

Generate ONE highly realistic, single-sentence question that a Consular Officer would ask this applicant. 
Focus on topics like: purpose of travel, financial support, ties to home country, study/work plans, or previous travel history.
Return ONLY valid JSON in this exact format:
{
  "question": "The question text here"
}
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
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API Error:', errorText);
      return NextResponse.json({ error: 'Failed to generate question' }, { status: 500 });
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate Visa Question Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
