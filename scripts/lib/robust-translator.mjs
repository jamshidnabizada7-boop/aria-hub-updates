import 'dotenv/config';

const EASTERN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toEasternDigits(text) {
  if (!text) return text;
  return text.replace(/(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\d)/g, (m, url, digit) => {
    if (url) return url;
    if (digit !== undefined && digit !== null) return EASTERN_DIGITS[parseInt(digit, 10)];
    return m;
  });
}

export function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

export function cleanForeignScripts(str) {
  if (!str) return str;
  return str
    .replace(/[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uFF01-\uFF60\uFFE0-\uFFE6]/g, '')
    .replace(/[\u0400-\u04FF]/g, '')
    .replace(/[\u0900-\u097F]/g, '')
    .replace(/Dummy/gi, '')
    .trim();
}

export function normalizeLabels(text, lang) {
  if (!text) return text;
  if (lang === 'fa') {
    return text
      .replace(/آخرین مهلت:/g, 'مهلت درخواست:')
      .replace(/ددلاین:/g, 'مهلت درخواست:')
      .replace(/مزایای:/g, 'مزایا:')
      .replace(/شرایط واجد شرایط بودن:/g, 'شرایط:')
      .replace(/معیارهای واجد شرایط بودن:/g, 'شرایط:');
  } else {
    return text
      .replace(/وروستۍ نیټه:/g, 'د غوښتنلیک نیټه:')
      .replace(/ددلاین:/g, 'د غوښتنلیک نیټه:')
      .replace(/ګټي:/g, 'ګټې:')
      .replace(/د وړتیا معیارونه:/g, 'د وړتیا شرایط:');
  }
}

function parseJsonSafe(text) {
  if (!text) throw new Error('Empty text for JSON parsing');
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Strip ```json ... ``` code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {}
  }

  // Find first { and last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }

  throw new Error(`Unable to parse JSON from text: ${text.slice(0, 150)}...`);
}

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

async function callGeminiModel(model, prompt) {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${model} ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseJsonSafe(text);
}

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq 120b ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  return parseJsonSafe(text);
}

export async function callLLM(prompt) {
  // 1. Try Gemini models in order
  for (const model of GEMINI_MODELS) {
    try {
      return await callGeminiModel(model, prompt);
    } catch (err) {
      console.warn(`[${model} failed]: ${err.message.slice(0, 100)}. Trying next...`);
    }
  }

  // 2. Fallback to Groq 120b
  console.warn('[Falling back to Groq 120b]');
  return await callGroq(prompt);
}
