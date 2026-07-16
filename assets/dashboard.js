/* ============================================================
   Cancer in the Commonwealth — Teacher Dashboard logic
   Extracted from an inline <script type="module"> block on
   dashboard.html so the site's Content-Security-Policy doesn't
   need to allow 'unsafe-inline' scripts. Behavior is unchanged;
   only the two import paths below were updated (this file now
   lives in assets/, alongside the files it imports).
   ============================================================ */
import { SUPABASE_ENABLED, supabaseUrl, supabaseAnonKey } from "./supabase-config.js";
import account from "./account.js";

const loadingEl   = document.getElementById("dashLoading");
const lockedEl    = document.getElementById("dashLocked");
const contentEl   = document.getElementById("dashContent");
const summaryEl   = document.getElementById("dashSummary");
const headEl      = document.getElementById("dashHead");
const bodyEl      = document.getElementById("dashBody");
const countEl     = document.getElementById("dashCount");
const searchInput = document.getElementById("dashSearch");
const exportBtn   = document.getElementById("dashExportBtn");
const refreshBtn  = document.getElementById("dashRefreshBtn");
const tabs        = document.querySelectorAll(".dash-tab");

const MODULE_IDS = ["module1", "module2", "module3"];
const MODULE_LABELS = {
  module1: "M1: Cancer Basics",
  module2: "M2: Risk Factors",
  module3: "M3: Diagnosis & Tx",
};

let allRows = [];
let activeTab = "all";
let searchTerm = "";
let supabase = null;

function showLocked() {
  loadingEl.hidden = true;
  lockedEl.hidden = false;
  contentEl.hidden = true;
}

function showContent() {
  loadingEl.hidden = true;
  lockedEl.hidden = true;
  contentEl.hidden = false;
}

if (!SUPABASE_ENABLED) {
  showLocked();
} else {
  bootDashboard();
}

async function bootDashboard() {
  // Wait for account.js to expose the Supabase client
  await new Promise((resolve) => {
    if (window.CIC_SUPABASE) { resolve(); return; }
    window.addEventListener("cic-supabase-ready", resolve, { once: true });
    // Fallback: boot our own client
    setTimeout(async () => {
      if (!window.CIC_SUPABASE) {
        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        window.CIC_SUPABASE = createClient(supabaseUrl, supabaseAnonKey);
      }
      resolve();
    }, 2500);
  });

  supabase = window.CIC_SUPABASE;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session) {
      showLocked();
      return;
    }
    const isTeacher = await checkTeacher(session.user.id);
    if (!isTeacher) {
      showLocked();
      return;
    }
    showContent();
    await loadData();
  });

  // Check current session immediately
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    showLocked();
    return;
  }
  const isTeacher = await checkTeacher(session.user.id);
  if (!isTeacher) {
    showLocked();
    return;
  }
  showContent();
  await loadData();
}

async function checkTeacher(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return !error && data && data.role === "teacher";
  } catch (e) {
    return false;
  }
}

async function loadData() {
  countEl.textContent = "Loading student data\u2026";
  try {
    // Join progress with auth users via profiles table
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, role, created_at");

    const { data: progressRows, error: prErr } = await supabase
      .from("progress")
      .select("user_id, data, updated_at");

    if (pErr || prErr) {
      countEl.textContent = "Couldn't load data. Check your Supabase setup.";
      return;
    }

    const progressMap = {};
    (progressRows || []).forEach((r) => { progressMap[r.user_id] = r; });

    allRows = (profiles || [])
      .filter((p) => p.role !== "teacher")
      .map((p) => {
        const pr = progressMap[p.id] || {};
        const moduleData = (pr.data && pr.data.progress) || {};
        return {
          id: p.id,
          email: p.email || "(no email)",
          created_at: p.created_at,
          updated_at: pr.updated_at,
          modules: MODULE_IDS.reduce((acc, mid) => {
            acc[mid] = moduleData[mid] || {};
            return acc;
          }, {}),
        };
      });

    renderSummary();
    renderTable();
  } catch (e) {
    countEl.textContent = "Error loading data: " + (e.message || e);
  }
}

function renderSummary() {
  const total = allRows.length;
  const completedAny = allRows.filter((r) =>
    MODULE_IDS.some((m) => r.modules[m].completed)
  ).length;
  const completedAll = allRows.filter((r) =>
    MODULE_IDS.every((m) => r.modules[m].completed)
  ).length;

  function avgScore(mid, type) {
    const rows = allRows.filter((r) => r.modules[mid][type + "Total"]);
    if (!rows.length) return "\u2014";
    const avg = rows.reduce((s, r) => s + r.modules[mid][type + "Score"] / r.modules[mid][type + "Total"], 0) / rows.length;
    return Math.round(avg * 100) + "%";
  }

  summaryEl.innerHTML = [
    { tag: "Students", val: total },
    { tag: "Started ≥ 1 module", val: completedAny },
    { tag: "Finished all 3", val: completedAll },
    { tag: "Avg M1 post-test", val: avgScore("module1", "posttest") },
    { tag: "Avg M2 post-test", val: avgScore("module2", "posttest") },
    { tag: "Avg M3 post-test", val: avgScore("module3", "posttest") },
  ].map((s) =>
    `<div class="info-card" style="text-align:center;">
       <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:700;color:var(--ridge-1);">${s.val}</div>
       <div style="font-family:var(--font-mono);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-soft);margin-top:0.25rem;">${s.tag}</div>
     </div>`
  ).join("");
}

function filteredRows() {
  return allRows.filter((r) => {
    const matchSearch = !searchTerm || r.email.toLowerCase().includes(searchTerm);
    const matchTab = activeTab === "all" || r.modules[activeTab].furthest > 0 || r.modules[activeTab].completed;
    return matchSearch && matchTab;
  });
}

function scoreCell(pre, preTotal, post, postTotal) {
  if (!postTotal) return '<td class="score-cell" style="color:var(--ink-faint);">\u2014</td>';
  const preStr = preTotal ? pre + "/" + preTotal : "\u2014";
  const diff = preTotal ? post - pre : null;
  const arrow = diff === null ? "" : diff > 0 ? " \u2191" : diff < 0 ? " \u2193" : " \u2192";
  const color = diff > 0 ? "var(--ridge-2)" : diff < 0 ? "var(--clay)" : "var(--ink-soft)";
  return `<td class="score-cell">
    <span style="color:var(--ink-soft);font-size:0.78rem;">${preStr}</span>
    &rarr;
    <strong>${post}/${postTotal}</strong>
    <span style="color:${color};font-size:0.78rem;">${arrow}</span>
  </td>`;
}

function renderTable() {
  const rows = filteredRows();
  const showAll = activeTab === "all";

  // Build header
  let headHTML = "<tr><th>Email</th>";
  if (showAll) {
    MODULE_IDS.forEach((mid) => {
      headHTML += `<th>${MODULE_LABELS[mid]}: pre&rarr;post</th>`;
    });
    headHTML += "<th>Completed</th>";
  } else {
    headHTML += `<th>Pre-test</th><th>Post-test</th><th>Pre&rarr;Post</th><th>Completed?</th>`;
  }
  headHTML += "<th>Last active</th></tr>";
  headEl.innerHTML = headHTML;

  if (rows.length === 0) {
    bodyEl.innerHTML = `<tr><td colspan="10" class="dashboard-empty" style="text-align:center;padding:2rem;">No students match this filter.</td></tr>`;
    countEl.textContent = "";
    return;
  }

  bodyEl.innerHTML = rows.map((r) => {
    let cells = `<td style="font-family:var(--font-mono);font-size:0.82rem;">${escHTML(r.email)}</td>`;

    if (showAll) {
      MODULE_IDS.forEach((mid) => {
        const m = r.modules[mid];
        cells += scoreCell(m.pretestScore, m.pretestTotal, m.posttestScore, m.posttestTotal);
      });
      const done = MODULE_IDS.filter((mid) => r.modules[mid].completed).length;
      cells += `<td><span class="status-pill ${done === 3 ? "is-complete" : done > 0 ? "is-progress" : ""}">${done}/3</span></td>`;
    } else {
      const m = r.modules[activeTab];
      const preStr = m.pretestTotal ? m.pretestScore + "/" + m.pretestTotal : "\u2014";
      const postStr = m.posttestTotal ? m.posttestScore + "/" + m.posttestTotal : "\u2014";
      const diff = (m.pretestTotal && m.posttestTotal) ? m.posttestScore - m.pretestScore : null;
      const arrow = diff === null ? "\u2014" :
        (diff > 0 ? `<span style="color:var(--ridge-2);">+${diff}</span>` :
         diff < 0 ? `<span style="color:var(--clay);">${diff}</span>` :
         `<span style="color:var(--ink-soft);">0</span>`);
      cells += `<td class="score-cell">${preStr}</td>`;
      cells += `<td class="score-cell"><strong>${postStr}</strong></td>`;
      cells += `<td class="score-cell">${arrow}</td>`;
      cells += `<td>${m.completed
        ? '<span class="status-pill is-complete">Yes</span>'
        : '<span class="status-pill">No</span>'}</td>`;
    }

    const lastActive = r.updated_at
      ? new Date(r.updated_at).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" })
      : "\u2014";
    cells += `<td style="color:var(--ink-faint);font-size:0.82rem;">${lastActive}</td>`;

    return `<tr>${cells}</tr>`;
  }).join("");

  countEl.textContent = rows.length + " student" + (rows.length !== 1 ? "s" : "");
}

function escHTML(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// Tab switching
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.remove("is-active", "btn--gold");
      t.classList.add("btn--ghost");
    });
    tab.classList.add("is-active", "btn--gold");
    tab.classList.remove("btn--ghost");
    activeTab = tab.dataset.tab;
    renderTable();
  });
});

// Search
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  renderTable();
});

// Refresh
refreshBtn.addEventListener("click", loadData);

// CSV export
exportBtn.addEventListener("click", () => {
  const rows = filteredRows();
  const header = ["Email", "M1 Pre", "M1 Post", "M2 Pre", "M2 Post", "M3 Pre", "M3 Post", "M1 Done", "M2 Done", "M3 Done", "Last Active"];
  const csvRows = [header.join(",")];

  rows.forEach((r) => {
    const cells = [
      '"' + r.email.replace(/"/g, '""') + '"',
      ...MODULE_IDS.flatMap((mid) => {
        const m = r.modules[mid];
        return [
          m.pretestTotal ? m.pretestScore + "/" + m.pretestTotal : "",
          m.posttestTotal ? m.posttestScore + "/" + m.posttestTotal : "",
        ];
      }),
      ...MODULE_IDS.map((mid) => r.modules[mid].completed ? "Yes" : "No"),
      r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "",
    ];
    csvRows.push(cells.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cancer-curriculum-results-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
});
