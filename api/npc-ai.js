// Vercel serverless function: keeps the Gemini API key off the public client.
const MODEL = "gemini-3.8-flash";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 18;
const requests = new Map();

function clean(value, max = 160) {
  return String(value ?? "").replace(/[<>\u0000-\u001f]/g, " ").trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "Gemini is not configured yet. Add GEMINI_API_KEY in Vercel settings." });

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const now = Date.now();
  const bucket = requests.get(ip);
  if (bucket && now - bucket.start < WINDOW_MS && bucket.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: "NPC chat is taking a short break. Try again in a minute." });
  }
  if (!bucket || now - bucket.start >= WINDOW_MS) requests.set(ip, { start: now, count: 1 });
  else bucket.count++;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const npc = body.npc && typeof body.npc === "object" ? body.npc : {};
  const message = clean(body.message, 240);
  if (!message) return res.status(400).json({ error: "Write a message first." });

  const profile = {
    name: clean(npc.name, 48) || "City resident",
    job: clean(npc.job, 48) || "Resident",
    hobby: clean(npc.hobby, 60),
    mood: clean(npc.mood, 32),
    goal: clean(npc.goal, 100),
    lifeGoal: clean(npc.lifeGoal, 100),
    friendship: Math.max(0, Math.min(100, Number(npc.friendship) || 0))
  };
  const history = Array.isArray(body.history) ? body.history.slice(-6).map(turn => ({
    role: turn && turn.role === "model" ? "model" : "user",
    parts: [{ text: clean(turn && turn.text, 240) }]
  })).filter(turn => turn.parts[0].text) : [];

  const systemInstruction = [
    "You are a fictional, friendly non-player character in the mobile game CityLife3D.",
    "Stay in character using the NPC profile. Be warm, natural, concise, and specific to the city.",
    "Reply in 1 or 2 short sentences suitable for a teen-rated game.",
    "Keep all interactions non-sexual and age-appropriate. Do not roleplay romance, sexual activity, or adult relationships.",
    "Do not request or reveal real-world personal information, contact details, passwords, or location.",
    "Do not claim to control game systems or perform actions you cannot perform.",
    "If asked about unsafe real-world activities, briefly discourage them and steer back to the game."
  ].join(" ");
  const prompt = "NPC profile: " + JSON.stringify(profile) + "\nPlayer says: " + message;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [...history, { role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 120 }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Gemini request failed:", response.status, data && data.error && data.error.status);
      return res.status(502).json({ error: "Gemini could not reply just now. The NPC's offline dialogue is still available." });
    }
    const reply = (data.candidates || []).flatMap(c => c.content && c.content.parts || [])
      .map(p => p.text || "").join(" ").trim().slice(0, 420);
    if (!reply) return res.status(502).json({ error: "Gemini returned an empty reply. Please try again." });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini connection error:", error && error.message);
    return res.status(502).json({ error: "Could not reach Gemini. The NPC's offline dialogue is still available." });
  }
};
