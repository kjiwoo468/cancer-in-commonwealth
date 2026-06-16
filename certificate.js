/* ============================================================
   Cancer in the Commonwealth — Certificate of Completion
   ============================================================
   Reads each module's saved progress (pre/post-test scores and
   completion status) from this browser's storage and renders a
   printable certificate. Works entirely offline / without
   accounts — if accounts are enabled, the name field is
   pre-filled from the signed-in email as a convenience.
   ============================================================ */

(function () {
  const MODULES = [
    { id: "module1", title: "Cancer Basics & Health Disparities", short: "Module 1" },
    { id: "module2", title: "Risk Factors & Modifiable Behaviors",  short: "Module 2" },
    { id: "module3", title: "Diagnosis & Treatment",                short: "Module 3" },
  ];

  const nameInput = document.getElementById("certName");
  const select = document.getElementById("certSelect");
  const output = document.getElementById("certificateOutput");
  const printBtn = document.getElementById("certPrintBtn");
  const emptyState = document.getElementById("certEmptyState");
  const controls = document.getElementById("certControls");

  const NAME_KEY = "cic_cert_name";

  function getCompletedModules() {
    return MODULES.filter((m) => CIC.getModuleProgress(m.id).completed);
  }

  function formatDate() {
    const d = new Date();
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function buildSeal() {
    return (
      '<svg class="certificate__seal" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="28" cy="12" r="6" fill="#D9A33E"/>' +
      '<path d="M0 32 L10 18 L17 26 L24 14 L34 28 L40 22 L40 40 L0 40 Z" fill="#6f9482"/>' +
      '<path d="M0 36 L14 24 L26 34 L40 30 L40 40 L0 40 Z" fill="#233b32"/>' +
      "</svg>"
    );
  }

  function renderCertificate() {
    const name = (nameInput.value || "").trim() || "________________________";
    const value = select.value;

    if (!value) {
      output.hidden = true;
      printBtn.hidden = true;
      return;
    }
    output.hidden = false;
    printBtn.hidden = false;

    let bodyHTML = "";
    let scoresHTML = "";

    if (value === "full") {
      bodyHTML =
        "has successfully completed all three modules of the <strong>Cancer in the Commonwealth</strong> " +
        "curriculum &mdash; Cancer Basics &amp; Health Disparities, Risk Factors &amp; Modifiable Behaviors, " +
        "and Diagnosis &amp; Treatment &mdash; including the pre- and post-assessment for each module.";

      scoresHTML = MODULES.map((m) => {
        const p = CIC.getModuleProgress(m.id);
        const pre  = p.pretestTotal  ? p.pretestScore  + "/" + p.pretestTotal  : "\u2014";
        const post = p.posttestTotal ? p.posttestScore + "/" + p.posttestTotal : "\u2014";
        return (
          '<span class="status-pill is-complete">' +
          m.short + ": " + pre + " \u2192 " + post +
          "</span>"
        );
      }).join("");
    } else {
      const m = MODULES.find((m) => m.id === value);
      const p = CIC.getModuleProgress(value);
      const pre = p.pretestTotal ? p.pretestScore + "/" + p.pretestTotal : null;
      const post = p.posttestTotal ? p.posttestScore + "/" + p.posttestTotal : null;

      bodyHTML =
        "has successfully completed <strong>" + m.title + "</strong>, part of the " +
        "<strong>Cancer in the Commonwealth</strong> curriculum" +
        (post ? ", scoring " + post + " on the post-assessment" + (pre ? " (starting score: " + pre + ")" : "") : "") +
        ".";

      if (post) {
        scoresHTML =
          '<span class="status-pill is-complete">Starting score: ' + (pre || "\u2014") + "</span>" +
          '<span class="status-pill is-complete">Ending score: ' + post + "</span>";
      }
    }

    output.innerHTML =
      buildSeal() +
      '<p class="certificate__eyebrow">Certificate of Completion</p>' +
      "<h1>Cancer in the Commonwealth</h1>" +
      '<p class="certificate__name">' + escapeHTML(name) + "</p>" +
      '<p class="certificate__body">' + bodyHTML + "</p>" +
      '<div class="certificate__scores">' + scoresHTML + "</div>" +
      '<div class="certificate__footer">' +
      '<div class="certificate__sig">' +
      '<div class="certificate__sig-value">' + formatDate() + "</div>" +
      '<div class="certificate__sig-line">Date Completed</div>' +
      "</div>" +
      '<div class="certificate__sig">' +
      '<div class="certificate__sig-value">&nbsp;</div>' +
      '<div class="certificate__sig-line">Program Facilitator</div>' +
      "</div>" +
      "</div>";
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function populateSelect() {
    const completed = getCompletedModules();
    select.innerHTML = "";

    if (completed.length === 0) {
      emptyState.hidden = false;
      controls.hidden = true;
      output.hidden = true;
      printBtn.hidden = true;
      return;
    }

    emptyState.hidden = true;
    controls.hidden = false;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a certificate\u2026";
    select.appendChild(placeholder);

    completed.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.title;
      select.appendChild(opt);
    });

    if (completed.length === MODULES.length) {
      const opt = document.createElement("option");
      opt.value = "full";
      opt.textContent = "Full course (all three modules)";
      select.appendChild(opt);
      select.value = "full";
    } else {
      select.value = completed[completed.length - 1].id;
    }
  }

  // Restore saved name
  try {
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) nameInput.value = savedName;
    else if (window.CIC_USER_EMAIL) nameInput.value = window.CIC_USER_EMAIL;
  } catch (e) {}

  // account.js loads asynchronously (ES module) — check for a signed-in email
  // a second later, in case the user is signed in and no name was already saved.
  setTimeout(() => {
    try {
      const savedName = localStorage.getItem(NAME_KEY);
      if (!savedName && !nameInput.value && window.CIC_USER_EMAIL) {
        nameInput.value = window.CIC_USER_EMAIL;
        renderCertificate();
      }
    } catch (e) {}
  }, 1500);

  nameInput.addEventListener("input", () => {
    try {
      localStorage.setItem(NAME_KEY, nameInput.value);
    } catch (e) {}
    renderCertificate();
  });

  select.addEventListener("change", renderCertificate);

  printBtn.addEventListener("click", () => {
    window.print();
  });

  populateSelect();
  renderCertificate();
})();
