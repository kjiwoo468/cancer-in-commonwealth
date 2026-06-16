/* ============================================================
   Cancer in the Commonwealth — Optional Accounts (Supabase)
   ============================================================
   This file is loaded as a <script type="module"> on every
   page. If accounts haven't been set up (the default), it does
   nothing and the "Sign in" UI stays hidden — the site behaves
   exactly as it does without this file.

   If SUPABASE_ENABLED is true in supabase-config.js, this file:
    - Shows the "Sign in to save progress" button in the header
    - Lets a student create an account, sign in, or reset a
      forgotten password (email-based) with email + password
    - On sign-in, checks for previously-saved progress in the
      cloud and merges it in (reloading the page so everything
      reflects the saved progress)
    - Whenever progress changes locally, saves a copy to the
      cloud (debounced) so it can be picked up on another device
    - If the signed-in account has the "teacher" role, reveals
      a "Dashboard" link in the navigation
   ============================================================ */

import { SUPABASE_ENABLED, supabaseUrl, supabaseAnonKey } from "./supabase-config.js";

if (SUPABASE_ENABLED) {
  initAccounts();
}

export default {}; // allows dashboard.html to import without error

async function initAccounts() {
  const accountUI = document.querySelector(".account-ui");
  if (accountUI) accountUI.style.display = "flex";

  let createClient;
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    createClient = mod.createClient;
  } catch (e) {
    console.error("Cancer in the Commonwealth: couldn't load the account system.", e);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Make the client available to certificate.html / dashboard.html
  window.CIC_SUPABASE = supabase;
  window.dispatchEvent(new CustomEvent("cic-supabase-ready", { detail: { supabase } }));

  const accountBtn = document.getElementById("accountBtn");
  const accountStatus = document.getElementById("accountStatus");
  const dashboardLink = document.getElementById("dashboardLink");
  const modal = document.getElementById("accountModal");
  const modalClose = document.getElementById("accountModalClose");
  const form = document.getElementById("accountForm");
  const emailInput = document.getElementById("accountEmail");
  const passwordInput = document.getElementById("accountPassword");
  const errorEl = document.getElementById("accountError");
  const infoEl = document.getElementById("accountInfo");
  const signUpBtn = document.getElementById("accountSignUp");
  const forgotBtn = document.getElementById("accountForgot");
  const continueGuestBtn = document.getElementById("accountContinueGuest");

  // Hero section
  const heroSignup = document.getElementById("heroSignup");
  const heroSignedIn = document.getElementById("heroSignedIn");
  const heroCreateAccountBtn = document.getElementById("heroCreateAccountBtn");
  const heroSignInBtn = document.getElementById("heroSignInBtn");
  const heroProgressMeta = document.getElementById("heroProgressMeta");

  // Callout card
  const calloutSignedOut = document.getElementById("accountCalloutSignedOut");
  const calloutSignedIn = document.getElementById("accountCalloutSignedIn");
  const calloutCreateBtn = document.getElementById("calloutCreateBtn");
  const calloutSignInBtn = document.getElementById("calloutSignInBtn");

  // Show the hero sign-up area (only reachable when accounts are enabled)
  if (heroSignup) heroSignup.hidden = false;
  if (calloutSignedOut) calloutSignedOut.hidden = false;

  let currentUser = null;
  let pushTimeout = null;

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    setError("");
    setInfo("");
  }
  function closeModal() {
    if (modal) modal.hidden = true;
  }
  function setError(msg) {
    if (errorEl) errorEl.textContent = msg;
    if (msg && infoEl) infoEl.textContent = "";
  }
  function setInfo(msg) {
    if (infoEl) infoEl.textContent = msg;
    if (msg && errorEl) errorEl.textContent = "";
  }

  if (accountBtn) {
    accountBtn.addEventListener("click", () => {
      if (currentUser) {
        supabase.auth.signOut();
      } else {
        openModal();
      }
    });
  }

  // Hero "Create a free account" — open modal, then focus the Create account button
  if (heroCreateAccountBtn) {
    heroCreateAccountBtn.addEventListener("click", () => {
      openModal();
      setTimeout(() => {
        const btn = document.getElementById("accountSignUp");
        if (btn) btn.focus();
      }, 60);
    });
  }

  // Hero "Sign in" — open modal normally
  if (heroSignInBtn) {
    heroSignInBtn.addEventListener("click", () => openModal());
  }

  // Callout card buttons — same behaviour
  if (calloutCreateBtn) {
    calloutCreateBtn.addEventListener("click", () => {
      openModal();
      setTimeout(() => {
        const btn = document.getElementById("accountSignUp");
        if (btn) btn.focus();
      }, 60);
    });
  }
  if (calloutSignInBtn) {
    calloutSignInBtn.addEventListener("click", () => openModal());
  }
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (continueGuestBtn) continueGuestBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      setError("");
      setInfo("");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(friendlyError(error));
    });
  }

  if (signUpBtn) {
    signUpBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      setError("");
      setInfo("");
      if (!email || !password) {
        setError("Enter an email and password first.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(friendlyError(error));
        return;
      }
      if (!data.session) {
        setInfo("Account created! If your teacher has email confirmation turned on, check your inbox for a confirmation link, then sign in.");
      }
    });
  }

  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      setError("");
      setInfo("");
      if (!email) {
        setError('Enter your email above, then click "Forgot password?" again.');
        return;
      }
      const redirectTo = new URL("reset-password.html", window.location.href).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        setError(friendlyError(error));
      } else {
        setInfo("Check your email for a link to reset your password.");
      }
    });
  }

  function friendlyError(err) {
    const msg = (err && err.message) || "";
    if (/already registered/i.test(msg)) return "That email already has an account \u2014 try signing in instead.";
    if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
    if (/email not confirmed/i.test(msg)) return "Please confirm your email first \u2014 check your inbox for a confirmation link.";
    if (/password should be at least/i.test(msg)) return "Password must be at least 6 characters.";
    if (/rate limit/i.test(msg)) return "Too many attempts \u2014 please wait a bit and try again.";
    if (/Unable to validate email/i.test(msg)) return "That email address doesn't look right.";
    if (msg) return msg;
    return "Something went wrong. Please try again.";
  }

  async function updateUIForUser(user) {
    currentUser = user;
    if (user) {
      closeModal();
      window.CIC_USER_EMAIL = user.email || "";
      if (accountBtn) accountBtn.textContent = "Sign out";
      if (accountStatus) accountStatus.textContent = "Signed in as " + user.email;

      // Hero: hide sign-up row, show "signed in" confirmation
      if (heroSignup) heroSignup.hidden = true;
      if (heroSignedIn) heroSignedIn.hidden = false;

      // Hero meta: update "saved on this device" to "syncs across devices"
      if (heroProgressMeta) {
        heroProgressMeta.innerHTML =
          '<strong>Progress syncs</strong> Across all your devices';
      }

      // Callout card
      if (calloutSignedOut) calloutSignedOut.hidden = true;
      if (calloutSignedIn) calloutSignedIn.hidden = false;

      await syncOnSignIn(user);
      await checkTeacherRole(user);
    } else {
      window.CIC_USER_EMAIL = "";
      if (accountBtn) accountBtn.textContent = "Sign in to save progress";
      if (accountStatus) accountStatus.textContent = "";
      if (dashboardLink) dashboardLink.hidden = true;

      // Hero: show sign-up row, hide "signed in" confirmation
      if (heroSignup) heroSignup.hidden = false;
      if (heroSignedIn) heroSignedIn.hidden = true;

      // Restore hero meta text
      if (heroProgressMeta) {
        heroProgressMeta.innerHTML =
          '<strong>Self-paced</strong> Your progress is saved on this device';
      }

      // Callout card
      if (calloutSignedOut) calloutSignedOut.hidden = false;
      if (calloutSignedIn) calloutSignedIn.hidden = true;
    }
  }

  async function checkTeacherRole(user) {
    if (!dashboardLink) return;
    try {
      const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      dashboardLink.hidden = !(!error && data && data.role === "teacher");
    } catch (e) {
      dashboardLink.hidden = true;
    }
  }

  async function syncOnSignIn(user) {
    try {
      const { data, error } = await supabase.from("progress").select("data").eq("user_id", user.id).maybeSingle();
      const local = window.CIC.getAllData();
      if (!error && data && data.data) {
        const cloud = data.data;
        if (JSON.stringify(local) !== JSON.stringify(cloud)) {
          window.CIC.setAllData(cloud);
          location.reload();
          return;
        }
      } else {
        await supabase.from("progress").upsert({
          user_id: user.id,
          data: local,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("Cancer in the Commonwealth: couldn't sync saved progress.", e);
    }
  }

  window.CIC.onChange(() => {
    if (!currentUser) return;
    clearTimeout(pushTimeout);
    pushTimeout = setTimeout(async () => {
      const local = window.CIC.getAllData();
      try {
        await supabase.from("progress").upsert({
          user_id: currentUser.id,
          data: local,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Cancer in the Commonwealth: couldn't save progress.", e);
      }
    }, 800);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && !location.pathname.endsWith("reset-password.html")) {
      // A password-reset link was opened somewhere other than the reset
      // page — send the user there (carrying the recovery token) so they
      // can set a new password.
      location.href = "reset-password.html" + location.hash;
      return;
    }
    updateUIForUser(session ? session.user : null);
  });
}
