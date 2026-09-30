/* ============================================================
   AskCommon — serverless chat endpoint (Vercel Function)

   Why this exists as a server function instead of calling an
   LLM directly from the browser: any API key placed in
   client-side JS is visible to anyone who views page source,
   which would let someone steal it and run up usage on your
   account. This function keeps the key server-side only, as an
   environment variable, and the browser only ever talks to this
   same-origin endpoint (already permitted by the site's existing
   `connect-src 'self'` CSP — no CSP changes needed).

   Provider: OpenRouter (https://openrouter.ai) — an OpenAI-
   compatible API that proxies many models, including several
   labeled ":free". See ASKCOMMON-SETUP.md for setup:
     1. Get a free API key at https://openrouter.ai/keys
     2. In the Vercel project: Settings -> Environment Variables,
        add OPENROUTER_API_KEY = <your key>.
     3. Redeploy. That's it — no other code changes needed.
   ============================================================ */

const { KB } = require("./knowledge-base");

const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_TURNS = 6;
const TOP_K_CHUNKS = 3;
// Free-tier model on OpenRouter. Free model availability changes over
// time — if this one stops working, check https://openrouter.ai/models?max_price=0
// and set OPENROUTER_MODEL in Vercel to whatever free slug is current.
const MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const SITE_URL = process.env.SITE_URL || "https://cancer-in-commonwealth.vercel.app";

const SYSTEM_PROMPT = `You are AskCommon, a friendly educational assistant built into "Cancer in the
Commonwealth," a free online cancer-education course for Kentucky high school
students (roughly ages 15-18).

SCOPE: Only answer questions about cancer biology, risk factors, prevention,
screening/early detection, diagnosis, treatment, cancer statistics and
disparities (especially Appalachian Kentucky), and how to use this course
(modules, quizzes, certificates, the risk calculator). If a question is
clearly unrelated to any of that (other homework subjects, unrelated personal
advice, etc.), politely say that's outside what you can help with here and
steer the conversation back to the course.

GROUNDING: Some reference material from the course may be included below,
under "COURSE CONTEXT." When it's relevant, base your answer on it and
mention which module covers the topic in more depth (e.g., "Module 2 covers
this in more depth"). If nothing relevant is provided, answer from general,
well-established cancer-education knowledge, and say so if you're not sure.

SAFETY (very important):
- You are not a doctor. Never diagnose, never tell someone whether they or
  someone else has cancer, and never recommend a specific treatment for a
  real person's situation.
- If a student describes their own or someone else's symptoms, or asks
  something like "do I have cancer" or "what should I do about my [personal
  situation]," respond with empathy, give general educational context if
  appropriate, and clearly recommend they talk to a parent/guardian, a
  school nurse, or a doctor. Do not attempt to assess their situation.
- If a message suggests self-harm or crisis, gently encourage them to talk
  to a trusted adult right now or contact the 988 Suicide & Crisis Lifeline
  (call or text 988 in the US), and do not continue the cancer topic as if
  nothing happened.

TONE: Clear, warm, age-appropriate for a teenager. Explain jargon simply.
Keep answers concise — a few sentences to a short paragraph, not an essay.
Never fabricate statistics or citations.`;

function scoreChunk(chunk, queryWords) {
  const haystack = (chunk.title + " " + chunk.keywords.join(" ") + " " + chunk.text).toLowerCase();
  let score = 0;
  queryWords.forEach((w) => {
    if (w.length < 3) return;
    if (chunk.keywords.some((k) => k.toLowerCase() === w)) score += 3;
    else if (haystack.includes(w)) score += 1;
  });
  return score;
}

function retrieveContext(message) {
  const queryWords = message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const scored = KB.map((chunk) => ({ chunk, score: scoreChunk(chunk, queryWords) }))
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K_CHUNKS);

  return scored.map((s) => s.chunk);
}

function buildContextBlock(chunks) {
  if (!chunks.length) return "";
  const lines = chunks.map(
    (c) => `- [${c.module}] ${c.title}: ${c.text}`
  );
  return "\n\nCOURSE CONTEXT (may or may not be relevant to this question):\n" + lines.join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "not_configured",
      message: "AskCommon isn't connected yet. An administrator needs to add an OPENROUTER_API_KEY.",
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const page = typeof body.page === "string" ? body.page.slice(0, 30) : "";
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];

  if (!message) {
    res.status(400).json({ error: "invalid_input", message: "Message is required." });
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      error: "invalid_input",
      message: "That message is a bit long — try asking in a shorter way.",
    });
    return;
  }

  const contextChunks = retrieveContext(message);
  const pageNote = page ? `\n\nThe student is currently viewing: ${page}.` : "";
  const systemInstruction = SYSTEM_PROMPT + pageNote + buildContextBlock(contextChunks);

  const messages = [{ role: "system", content: systemInstruction }];
  history.forEach((turn) => {
    if (!turn || typeof turn.text !== "string") return;
    const role = turn.role === "assistant" ? "assistant" : "user";
    messages.push({ role, content: turn.text.slice(0, MAX_MESSAGE_LENGTH) });
  });
  messages.push({ role: "user", content: message });

  const payload = {
    model: MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 400,
  };

  const url = "https://openrouter.ai/api/v1/chat/completions";

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": "AskCommon - Cancer in the Commonwealth",
      },
      body: JSON.stringify(payload),
    });

    if (upstream.status === 429) {
      res.status(429).json({
        error: "rate_limited",
        message: "AskCommon is getting a lot of questions right now — please try again in a minute.",
      });
      return;
    }

    if (!upstream.ok) {
      res.status(502).json({
        error: "upstream_error",
        message: "AskCommon couldn't reach its answer engine just now. Please try again shortly.",
      });
      return;
    }

    const data = await upstream.json();
    if (data && data.error) {
      res.status(502).json({
        error: "upstream_error",
        message: "AskCommon couldn't reach its answer engine just now. Please try again shortly.",
      });
      return;
    }

    const choice = data && data.choices && data.choices[0];
    const finishReason = choice && choice.finish_reason;
    const text = choice && choice.message && typeof choice.message.content === "string" ? choice.message.content : "";

    if (!text) {
      const blocked = finishReason === "content_filter";
      res.status(200).json({
        reply: blocked
          ? "I can't help with that one. If you or someone else needs support, please talk to a trusted adult, school nurse, or doctor."
          : "I'm not sure how to answer that — could you try rephrasing your question?",
      });
      return;
    }

    res.status(200).json({ reply: text.trim(), sources: contextChunks.map((c) => c.module) });
  } catch (err) {
    res.status(502).json({
      error: "upstream_error",
      message: "AskCommon couldn't reach its answer engine just now. Please try again shortly.",
    });
  }
};
