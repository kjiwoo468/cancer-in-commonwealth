/* ============================================================
   Cancer in the Commonwealth — "Ask Common" backend
   ============================================================
   This is a Vercel serverless function (deployed automatically
   at POST /api/ask-common because it lives in /api). It exists
   for ONE reason: to keep the Anthropic API key off the client.

   The previous version of this feature called
   https://api.anthropic.com/v1/messages directly from the
   browser with the key embedded in assets/anthropic-config.js.
   That is not safe to ship: anyone who opens their browser's
   Network tab can read the key out of the request headers and
   reuse it — on your Anthropic account, at your expense — from
   anywhere, forever (until you rotate it). Client-side JS cannot
   keep a secret; only server-side code can. This file is that
   server-side code.

   SETUP (do this once):
   1. Get an API key from https://console.anthropic.com (Settings
      -> API Keys).
   2. In your Vercel project: Settings -> Environment Variables ->
      add a variable named exactly ANTHROPIC_API_KEY with that key
      as the value. Do this for Production (and Preview/Development
      if you want it to work on preview deployments too).
   3. Redeploy. Never put the key in any file that gets committed
      to the repo or served to the browser — not in assets/*.js,
      not in this file, not in a .env file you accidentally commit.
   4. If assets/anthropic-config.js exists from an earlier attempt,
      delete it — it's no longer used and shouldn't contain a key.

   If ANTHROPIC_API_KEY isn't set, this function returns a clear
   "not_configured" error instead of crashing, and ask-common.html
   shows a friendly setup notice using that signal.
   ============================================================ */

const MODEL = "claude-sonnet-5";
const MAX_QUESTION_LENGTH = 480;
const MIN_QUESTION_LENGTH = 10;

/* ----------------------------------------------------------
   Curriculum grounding. This is what makes Common's answers
   "especially about the content of the module" rather than a
   generic cancer chatbot — it's given the site's own facts and
   told to prefer them over general knowledge when they overlap.

   Currently reflects Module 1 and the Appalachian Kentucky Cancer
   Risk Index research paper. Module 2 and Module 3 content isn't
   included yet — add it here (or as additional CURRICULUM_FACTS
   entries) once those files are available, so Common stays
   consistent with the whole curriculum rather than just Module 1.
   ---------------------------------------------------------- */
const CURRICULUM_FACTS = `
- Kentucky ranks first in the nation in both cancer incidence and cancer mortality (191.2 deaths per 100,000 — 29.6% above the U.S. average), and first among states specifically for lung cancer (83.6% above the U.S. average). Source: Siegel et al., "Cancer Statistics, 2026," CA: A Cancer Journal for Clinicians.
- Appalachian Kentucky's burden is higher still than the rest of the state: 5.6% higher all-site cancer incidence and 12.0% higher all-site mortality than non-Appalachian Kentucky, with the gap widest for cervical cancer (43.2% higher).
- Module 1 covers cancer basics and biology, the social and economic history of Appalachian Kentucky (coal industry decline, poverty, healthcare access), and why the region's cancer burden is so high.
- Key modifiable risk factors the curriculum emphasizes: tobacco use (Kentucky has one of the highest adult smoking rates of any U.S. state), obesity, alcohol use, radon exposure (many Kentucky counties have geologically elevated indoor radon), occupational exposure (underground coal mining and silica dust), physical inactivity, diet, HPV vaccination status (Kentucky youth vaccination coverage lags the national target, especially in rural areas), and screening adherence (colorectal, cervical, and lung cancer screening rates run lower in Appalachian Kentucky than the rest of the state).
- The site includes an interactive Cancer Risk Estimator (risk-calculator.html) covering the five cancers where Appalachian Kentucky's documented excess burden is largest: lung, colorectal, cervical, laryngeal, and oral cavity/pharyngeal cancer. If a student asks about their own personal risk, point them to that tool by name rather than estimating their individual risk yourself in a lesson.
- The curriculum frames Appalachian Kentucky's cancer burden as a mix of individual behavior AND structural/historical context (coal industry history, tobacco marketing history in the region, poverty, rural healthcare access, Health Professional Shortage Areas). Avoid framing it as solely a matter of personal choices, and avoid stigmatizing language about smoking or obesity.
`.trim();

const SYSTEM_PROMPT = `You are "Common," the AI research assistant for "Cancer in the Commonwealth," the University of Kentucky Markey Cancer Center's cancer education curriculum for students in Appalachian Kentucky.

A student is asking you a question about cancer, either in general or about something from the curriculum. Answer it by generating a personalized self-paced lesson across three learning areas:
1. Cancer Basics & Biology — foundational science and mechanisms
2. Risk Factors & Prevention — modifiable behaviors, Appalachian Kentucky context where relevant
3. Diagnosis & Treatment — detection methods and care options

CURRICULUM CONTEXT — ground your answer in these facts from the actual curriculum whenever the student's question touches on them. Prefer these over generic knowledge when they overlap, and don't contradict them. If the question goes beyond what's listed here, answer from sound general oncology knowledge, but don't invent Kentucky-specific or curriculum-specific statistics that aren't given below.
${CURRICULUM_FACTS}

Write clearly for high school students. Be accurate, empathetic, and specific. Do not invent statistics. If a question is really a request for individualized medical advice (e.g., "do I have cancer," "what should I do about my specific symptoms"), say plainly that you can't provide medical advice or a diagnosis and that they should talk to a doctor or trusted adult, and gently redirect to the general educational topic instead.

CRITICAL: Return ONLY a raw JSON object. No markdown fences, no preamble, no trailing text. Use exactly this structure:

{
  "title": "Concise lesson title (max 65 characters)",
  "subtitle": "One sentence describing what this lesson answers",
  "introduction": "2–3 sentence introduction that connects the student's question to cancer education broadly",
  "sections": [
    { "id": "basics", "eyebrow": "Cancer Basics & Biology", "title": "Section heading (max 50 characters)", "paragraphs": ["Paragraph 1.", "Paragraph 2.", "Paragraph 3."], "keyPoints": ["Key point one", "Key point two", "Key point three"] },
    { "id": "risk", "eyebrow": "Risk Factors & Prevention", "title": "Section heading (max 50 characters)", "paragraphs": ["Paragraph 1.", "Paragraph 2.", "Paragraph 3."], "keyPoints": ["Key point one", "Key point two", "Key point three"] },
    { "id": "treatment", "eyebrow": "Diagnosis & Treatment", "title": "Section heading (max 50 characters)", "paragraphs": ["Paragraph 1.", "Paragraph 2.", "Paragraph 3."], "keyPoints": ["Key point one", "Key point two", "Key point three"] }
  ],
  "knowledgeCheck": [
    { "question": "Question text?", "choices": ["Choice A", "Choice B", "Choice C", "Choice D"], "correct": 0, "explanation": "1–2 sentences explaining why this answer is correct." }
  ],
  "takeaways": ["Takeaway 1.", "Takeaway 2.", "Takeaway 3.", "Takeaway 4."]
}

Include exactly 4 knowledge check questions. Make the lesson engaging and accurate.`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed", message: "Use POST." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "not_configured",
      message: "ANTHROPIC_API_KEY isn't set in this deployment's environment variables yet.",
    });
  }

  const question = ((req.body && req.body.question) || "").toString().trim();
  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({
      error: "invalid_question",
      message: `Question must be between ${MIN_QUESTION_LENGTH} and ${MAX_QUESTION_LENGTH} characters.`,
    });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({}));
      const message = (errBody.error && errBody.error.message) || `Anthropic API error (${upstream.status}).`;
      // Don't forward raw upstream error text to the client — log it
      // server-side and return a clean, generic message instead.
      console.error("Ask Common upstream error:", upstream.status, message);
      return res.status(502).json({ error: "upstream_error", message: "The AI service returned an error. Please try again." });
    }

    const data = await upstream.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let lesson;
    try {
      lesson = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Ask Common: failed to parse model output as JSON:", parseErr, raw.slice(0, 500));
      return res.status(502).json({ error: "bad_response", message: "The AI response wasn't in the expected format. Please try again." });
    }

    return res.status(200).json({ lesson });
  } catch (err) {
    console.error("Ask Common unexpected error:", err);
    return res.status(500).json({ error: "server_error", message: "Something went wrong on our end. Please try again." });
  }
};
