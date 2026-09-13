import ZAI from 'z-ai-web-dev-sdk';
try {
  const zai = await ZAI.create();
  const r = await zai.chat.completions.create({
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
  });
  console.log('QUOTA OK →', r?.choices?.[0]?.message?.content?.slice(0, 40));
} catch (e) {
  console.log('QUOTA BLOCKED →', (e.message || e).slice(0, 140));
}
