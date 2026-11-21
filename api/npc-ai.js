// CityLife3D online NPC conversation endpoint (Vercel serverless).
// Keep GEMINI_API_KEY in Vercel Environment Variables; never expose it in browser code.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Online NPC chat is not configured. Add GEMINI_API_KEY in Vercel Environment Variables and redeploy.' });
  }
  const body = req.body || {};
  const npc = body.npc || {};
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 240) : '';
  if (!message) return res.status(400).json({ error: 'A message is required.' });

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const contents = [];
  for (const item of history) {
    if (!item || typeof item.text !== 'string') continue;
    const role = item.role === 'model' ? 'model' : item.role === 'user' ? 'user' : null;
    if (!role) continue;
    contents.push({ role, parts: [{ text: item.text.slice(0, 500) }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const safe = value => typeof value === 'string' ? value.slice(0, 120) : '';
  const systemText = [
    'You are a friendly fictional pedestrian in the mobile game CityLife3D.',
    'Stay in character as this NPC. Reply naturally and briefly in 1 to 3 sentences.',
    'Remember the conversation history provided. Use the NPC details to make replies personal.',
    'Do not claim to perform actions in the real world. Keep content suitable for a general audience.',
    'NPC details:',
    'Name: ' + safe(npc.name),
    'Job: ' + safe(npc.job),
    'Hobby: ' + safe(npc.hobby),
    'Mood: ' + safe(npc.mood),
    'Current activity: ' + safe(npc.goal),
    'Life goal: ' + safe(npc.lifeGoal),
    'Friendship level: ' + String(Math.max(0, Math.min(100, Number(npc.friendship) || 0)))
  ].join('\n');

  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.85, maxOutputTokens: 180 }
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data && data.error && data.error.message ? data.error.message : 'Gemini request failed.';
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502)
        .json({ error: message.slice(0, 300) });
    }
    const reply = (data.candidates || [])
      .flatMap(candidate => candidate.content && candidate.content.parts ? candidate.content.parts : [])
      .map(part => part.text || '')
      .join('')
      .trim();
    if (!reply) return res.status(502).json({ error: 'Gemini returned an empty reply. Please try again.' });
    return res.status(200).json({ reply: reply.slice(0, 900) });
  } catch (error) {
    return res.status(502).json({ error: 'Could not reach Gemini. Check the connection and try again.' });
  }
}
