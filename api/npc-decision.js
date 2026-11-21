// Vercel serverless function: Gemini chooses from safe, pre-approved NPC destinations.
const MODEL = "gemini-3.8-flash";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const requests = new Map();

function clean(value, max = 120) {
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
  if (!key) return res.status(503).json({ error: "Gemini is not configured." });

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const now = Date.now();
  const bucket = requests.get(ip);
  if (bucket && now - bucket.start < WINDOW_MS && bucket.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: "NPC decision limit reached. Try again shortly." });
  }
  if (!bucket || now - bucket.start >= WINDOW_MS) requests.set(ip, { start: now, count: 1 });
  else bucket.count++;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const npc = body.npc && typeof body.npc === "object" ? body.npc : {};
  const goals = Array.isArray(body.goals) ? body.goals.slice(0, 8).map(g => ({
    name: clean(g && g.name, 64),
    x: Number(g && g.x),
    z: Number(g && g.z)
  })).filter(g => g.name && Number.isFinite(g.x) && Number.isFinite(g.z) && Math.abs(g.x) <= 230 && Math.abs(g.z) <= 240) : [];
  if (!goals.length) return res.status(400).json({ error: "No valid destination choices." });

  const profile = {
    name: clean(npc.name, 40),
    job: clean(npc.job, 40),
    personality: clean(npc.personality, 80),
    mood: clean(npc.mood, 24),
    currentGoal: clean(npc.currentGoal, 80),
    lifeGoal: clean(npc.lifeGoal, 100),
    hobby: clean(npc.hobby, 40),
    hunger: Math.max(0, Math.min(100, Number(npc.hunger) || 0)),
    energy: Math.max(0, Math.min(100, Number(npc.energy) || 0)),
    stress: Math.max(0, Math.min(100, Number(npc.stress) || 0)),
    socialNeed: Math.max(0, Math.min(100, Number(npc.socialNeed) || 0)),
    friendship: Math.max(0, Math.min(100, Number(npc.friendship) || 0)),
    familiarPlaces: Array.isArray(npc.familiarPlaces) ? npc.familiarPlaces.slice(-5).map(v => clean(v, 40)) : [],
    recentMemories: Array.isArray(npc.memory) ? npc.memory.slice(-4).map(v => clean(v, 90)) : []
  };

  const systemInstruction = [
    "You are the planning module for one fictional pedestrian in CityLife3D.",
    "Choose exactly one destination from the supplied candidate list; never invent a destination or coordinates.",
    "Make a sensible independent choice using the NPC's personality, job, needs, hobbies, life goal, familiar places and recent memories.",
    "Prioritise rest when energy is very low, food/shop when hunger is high, calm places when stress is high, and social places when social need is high.",
    "Respect the NPC's long-term goal and vary choices when appropriate. Keep choices age-appropriate and non-sexual.",
    "Return only valid JSON with keys goal and reason. goal must exactly match one candidate name. reason must be under 90 characters."
  ].join(" ");

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ npc: profile, candidates: goals }) }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 100, responseMimeType: "application/json" }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Gemini decision failed:", response.status, data && data.error && data.error.status);
      return res.status(502).json({ error: "Gemini decision unavailable." });
    }
    const raw = (data.candidates || []).flatMap(c => c.content && c.content.parts || []).map(p => p.text || "").join("").trim();
    let decision;
    try { decision = JSON.parse(raw); } catch (_) { decision = null; }
    const selected = goals.find(g => g.name === clean(decision && decision.goal, 64));
    if (!selected) return res.status(502).json({ error: "Gemini returned an invalid destination." });
    return res.status(200).json({ goal: selected.name, reason: clean(decision.reason, 90) });
  } catch (error) {
    console.error("Gemini decision connection error:", error && error.message);
    return res.status(502).json({ error: "Could not reach Gemini." });
  }
};
