import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/admin-auth';

export async function POST(request: Request) {

  // Abuse guard: AI calls cost real money and this endpoint is public.
  const __ip = getClientIp(request as unknown as Request) || 'unknown';
  if (!rateLimit(`ai:${__ip}`, 10)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }
  try {
    const { action, content, context, language = 'en' } = await request.json();
    
    const groqApiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    
    if (!groqApiKey) {
      return NextResponse.json({ success: false, error: 'Groq API key not configured' }, { status: 503 });
    }
    
    let systemPrompt = '';
    
    if (action === 'personalize') {
      systemPrompt = `You are an expert career counselor and document writer. Rewrite the provided document template using the provided user context to make it highly personalized, professional, and persuasive. Output ONLY the raw markdown of the new document. Do not wrap it in JSON. Do not include introductory text.

User Context:
${context}`;
    } else if (action === 'improve_grammar') {
      systemPrompt = `You are an expert editor. Improve the grammar, flow, and professionalism of the provided text. Keep the same meaning and tone, but make it sound like a highly educated native speaker wrote it. Output ONLY the raw markdown of the corrected document. Do not wrap it in JSON. Do not include introductory text.`;
    } else if (action === 'translate') {
      systemPrompt = `You are an expert translator. Translate the following text to ${language}. Output ONLY the raw translated markdown. Do not wrap it in JSON. Do not include introductory text.`;
    } else if (action === 'rewrite') {
      if (context) {
        systemPrompt = `You are an expert document optimizer. ${context} Output ONLY the raw markdown of the optimized document. Do not wrap it in JSON. Do not include introductory text.`;
      } else {
        systemPrompt = `You are an expert document editor. Rewrite the provided document to make it sound incredibly professional, clear, and persuasive. Output ONLY the raw markdown of the rewritten document. Do not wrap it in JSON. Do not include introductory text.`;
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        temperature: 0.3
      })
    });

    if (response.ok) {
      const data = await response.json();
      let resultText = data.choices[0].message.content.trim();
      // Remove any surrounding markdown block ticks if the AI accidentally wrapped it
      if (resultText.startsWith('\`\`\`markdown')) {
        resultText = resultText.replace(/^\`\`\`markdown\n/, '').replace(/\n\`\`\`$/, '');
      } else if (resultText.startsWith('\`\`\`')) {
        resultText = resultText.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
      }
      return NextResponse.json({ success: true, text: resultText });
    } else {
      console.error("Groq API error:", await response.text());
      return NextResponse.json({ success: false, error: 'API Error' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in AI template route:', error);
    return NextResponse.json({ success: false, error: 'Failed to process AI request' }, { status: 500 });
  }
}

