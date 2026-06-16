/* ============================================================
   Cancer in the Commonwealth — Account Configuration
   ============================================================

   This site works perfectly well WITHOUT this file doing
   anything — by default, every visitor's progress is saved
   only in their own browser (on their own device).

   If you'd like students to be able to create a free account
   — with a "forgot password" option, progress that follows
   them across devices, printable completion certificates, and
   a teacher dashboard showing everyone's results — you can
   turn that on using Supabase, a free backend service.

   Setup steps (full details with copy-paste SQL are in
   README.md, under "Setting up accounts (optional)"):

     1. Create a free project at https://supabase.com
     2. In the SQL Editor, run the setup script from the README
        (creates the tables, security rules, and a "teacher"
        role system)
     3. In Project Settings > API, copy your Project URL and
        "anon public" key into supabaseUrl / supabaseAnonKey
        below
     4. In Authentication > URL Configuration, set your Site
        URL to the address where this site is hosted
     5. Change SUPABASE_ENABLED to true below

   ============================================================ */

export const SUPABASE_ENABLED = true;

export const supabaseUrl = "https://bxvlheckmpaxpzorxykq.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4dmxoZWNrbXBheHB6b3J4eWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MjgxNjAsImV4cCI6MjA5NzIwNDE2MH0.kVEXT13TXLiuHYyLMVODh2YRNlEY1OBfr0hfh_kPT2I";
