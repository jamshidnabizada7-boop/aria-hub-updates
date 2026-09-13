import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {

  // Abuse guard: AI calls cost real money and this endpoint is public.
  const __ip = getClientIp(req as unknown as Request) || 'unknown';
  if (!rateLimit(`ai:${__ip}`, 10)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  }
  try {
    const { query } = await req.json();
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      console.warn("GROQ_API_KEY not found. Returning empty suggestions.");
      return NextResponse.json({ suggestions: [] });
    }

    // 1. Fetch available titles and organizations for context
    // Cap the context scan: this is a public endpoint — never load the whole
    // table per request. Recent listings are the most useful suggestions.
    const allOpps = await db.opportunity.findMany({
      where: { status: 'published' },
      select: { title: true, organization: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const uniqueNames = new Set<string>();
    allOpps.forEach(o => {
      if (o.title) uniqueNames.add(o.title);
      if (o.organization) uniqueNames.add(o.organization);
    });

    const contextList = Array.from(uniqueNames).slice(0, 300); // Limit to avoid context overflow

    // 2. Call Groq Llama 3 to find closest matches
    const prompt = `
    You are an AI search assistant for a scholarship and job portal.
    A user has searched for: "${query}"
    
    They might have misspelled it. 
    Here is a list of available opportunities and organizations:
    ${contextList.join('\n')}
    
    Based on the list above or your general knowledge, what did the user likely mean?
    Return ONLY a JSON array of up to 3 corrected string suggestions. Do NOT return any markdown formatting like \`\`\`json. Just the array.
    Example output: ["Microsoft", "Google Scholarship"]
    `;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      })
    });

    if (!groqRes.ok) {
      console.error("Groq API error", await groqRes.text());
      return NextResponse.json({ suggestions: [] });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "[]";
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        // Only return suggestions that are not identical to the query
        const suggestions = parsed.filter((s: string) => s.toLowerCase() !== query.toLowerCase());
        return NextResponse.json({ suggestions });
      }
    } catch (parseError) {
      console.error("Failed to parse Groq response:", content);
      
      // Fallback: If it's a single corrected string, try to extract it
      const match = content.match(/"([^"]+)"/g);
      if (match && match.length > 0) {
         const suggestions = match.map((s: string) => s.replace(/"/g, '')).filter((s: string) => s.toLowerCase() !== query.toLowerCase());
         return NextResponse.json({ suggestions });
      }
    }

    return NextResponse.json({ suggestions: [] });
  } catch (error) {
    console.error("AI Search Error:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
