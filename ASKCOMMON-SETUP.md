# Setting up AskCommon (the chat assistant)

AskCommon is the floating chat button in the bottom-right corner of every
page. Students can ask it free-form questions about cancer biology, risk
factors, screening, and treatment, and it answers using a real AI model —
grounded in this course's own content — plus clear safety guardrails (it
never diagnoses anyone and always points personal health questions to a
doctor, school nurse, or parent/guardian).

**The chat button works out of the box, but it won't actually answer
questions until you complete the one-time setup below.** Until then, it
tells students "AskCommon isn't connected yet" — nothing else on the site
is affected.

---

## Important: this only works if you're hosting on Vercel

AskCommon needs to run a small piece of server code (so that the AI
provider's API key stays private — never in a file a student's browser can
see). That server code lives in the `api/` folder and only works
automatically on **Vercel** (README.md's "Option C").

- ✅ **Vercel** — works with no extra setup beyond what's below.
- ❌ **Netlify Drop** (Option A) and **GitHub Pages** (Option B) — these
  are pure static hosting with no server code, so AskCommon's chat button
  will always say "not connected" there. Everything else on the site
  (modules, quizzes, certificates, risk calculator) still works completely
  normally on those options — only the chat feature needs Vercel.

If you're not sure which one you're using: if your site's address ends in
`.vercel.app` (or a custom domain you connected through Vercel), you're set.

---

## 1. Get a free API key

AskCommon is built to use **OpenRouter** (https://openrouter.ai), which
proxies many AI models — including several labeled **`:free`** that cost
nothing and don't require a credit card.

1. Go to **https://openrouter.ai/keys** (sign in or create a free account
   first if you haven't).
2. Click **"Create Key."** Give it any name (e.g. "AskCommon").
3. Copy the key it gives you — it starts with `sk-or-`.

Treat this key like a password — anyone who has it can use your free quota.
Don't paste it into the website's HTML/JS files, don't post it publicly,
and don't send it to anyone (including in chat with an AI assistant, this
one included). It only ever goes into the one place below.

---

## 2. Add it to Vercel as an environment variable

1. Log into **https://vercel.com** and open this project.
2. Go to **Settings → Environment Variables**.
3. Add a new variable:
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** paste the key you copied (starts with `sk-or-`)
   - **Environment:** Production (and Preview, if you want it working on
     preview deployments too)
4. Click **Save**.
5. Go to the **Deployments** tab and **redeploy** the latest deployment
   (environment variable changes don't apply until the next deploy).

That's the whole setup. No code changes needed.

### Optional: pick a different free model

By default, AskCommon uses the free model
`meta-llama/llama-3.3-70b-instruct:free`. OpenRouter's lineup of free
models changes over time — if that one is ever removed or renamed, you can
switch models without touching any code:

1. Check **https://openrouter.ai/models?max_price=0** for current free
   models (look for one that supports "chat completions" — most do).
2. In Vercel, add another environment variable: **Name:** `OPENROUTER_MODEL`,
   **Value:** the model's slug from that page (e.g.
   `qwen/qwen-2.5-72b-instruct:free`).
3. Redeploy.

---

## 3. Test it

Once redeployed, open your live site, click the **AskCommon** button, and
ask something like "why does smoking cause cancer?" You should get a real
answer within a few seconds, along with the disclaimer at the top of the
chat panel.

You can also test the server endpoint directly:

```bash
curl -i -X POST https://your-site.vercel.app/api/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"What is metastasis?"}'
```

This should return `200 OK` with a JSON body like `{"reply": "...", "sources": [...]}`.
If you instead get `{"error":"not_configured", ...}`, the environment
variable isn't set correctly yet, or the deploy hasn't picked it up — double
check step 2 and make sure you redeployed afterward.

---

## What AskCommon knows, and what it won't do

- Its answers are grounded in short factual excerpts pulled straight from
  Modules 1-3 (see `api/knowledge-base.js`) — it's told to mention which
  module covers a topic in more depth when relevant.
- It's instructed to stay on cancer/course topics and politely decline
  anything unrelated.
- It's instructed to never diagnose, never evaluate a real person's
  symptoms, and always redirect personal health questions to a trusted
  adult or doctor — see the full instructions in `api/ask.js` if you want
  to read or adjust them.
- Like any AI model, it can occasionally get something wrong or phrase
  things imperfectly. The chat panel's disclaimer stays visible the whole
  time to remind students of that.

## Cost and limits (good to know)

- Free OpenRouter models have rate limits (typically a small number of
  requests per minute, and a daily cap). A single classroom will typically
  stay within them, but a very active class could hit the daily limit —
  see current limits at https://openrouter.ai/docs/api-reference/limits.
- If the free quota is ever exceeded, students briefly see a friendly "a
  lot of questions right now, try again in a minute" message rather than
  an error — nothing breaks.
- There's no student login or tracking tied to AskCommon; each browser
  session's chat history is temporary and disappears on page reload.
- If you ever want to swap in a different provider (Google Gemini, Groq,
  etc.), that's a self-contained change inside `api/ask.js` — nothing in
  the rest of the site needs to change.
