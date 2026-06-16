/* ============================================================
   Cancer in the Commonwealth — Password Reset Handler
   ============================================================
   This page is reached by clicking the link in a "reset your
   password" email. Supabase automatically reads the recovery
   token from the URL and starts a temporary session, which
   fires a PASSWORD_RECOVERY auth event — at that point we show
   a form to set a new password.
   ============================================================ */

import { SUPABASE_ENABLED, supabaseUrl, supabaseAnonKey } from "./supabase-config.js";

const disabledEl = document.getElementById("resetDisabled");
const checkingEl = document.getElementById("resetChecking");
const invalidEl = document.getElementById("resetInvalid");
const formEl = document.getElementById("resetForm");
const successEl = document.getElementById("resetSuccess");
const errorEl = document.getElementById("resetError");
const passwordInput = document.getElementById("resetPassword");
const confirmInput = document.getElementById("resetConfirm");

if (!SUPABASE_ENABLED) {
  disabledEl.hidden = false;
} else {
  checkingEl.hidden = false;
  init();
}

async function init() {
  let createClient;
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    createClient = mod.createClient;
  } catch (e) {
    disabledEl.hidden = false;
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  let recoveryReady = false;

  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryReady = true;
      checkingEl.hidden = true;
      invalidEl.hidden = true;
      formEl.hidden = false;
    }
  });

  // Give Supabase a moment to process the recovery link from the URL
  // before deciding whether to show the "invalid link" message.
  setTimeout(() => {
    if (!recoveryReady) {
      checkingEl.hidden = true;
      invalidEl.hidden = false;
    }
  }, 1800);

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const pw = passwordInput.value;
    const confirm = confirmInput.value;

    if (pw.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (pw !== confirm) {
      errorEl.textContent = "Passwords don't match.";
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      errorEl.textContent = error.message || "Something went wrong. Please try again.";
      return;
    }

    formEl.hidden = true;
    successEl.hidden = false;
  });
}
