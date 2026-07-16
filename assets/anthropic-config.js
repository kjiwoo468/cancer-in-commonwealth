/* ============================================================
   Cancer in the Commonwealth — Anthropic AI Configuration
   ============================================================
   This file enables the "Ask Common" AI-powered lesson
   generator. By default it's off — the site works fine without
   it.

   Setup steps (about 5 minutes):
     1. Go to https://console.anthropic.com and sign up / sign in.
     2. Click "API Keys" in the left sidebar → "Create Key."
     3. Copy the key (it starts with "sk-ant-…") and paste it
        below as ANTHROPIC_API_KEY.
     4. Change ANTHROPIC_ENABLED to true.
     5. Re-upload your site folder (see README, Section 3).

   A note on security and billing:
   Unlike the Supabase anon key (which is intentionally public),
   your Anthropic API key grants access to paid AI services.
   Anyone who can view the page source can read it, so set a
   monthly spending limit in the Anthropic console to protect
   your account. For a small classroom, the cost per generated
   lesson is typically a few cents.
   ============================================================ */

export const ANTHROPIC_ENABLED = false;

export const ANTHROPIC_API_KEY = "sk-ant-your-api-key-here";
