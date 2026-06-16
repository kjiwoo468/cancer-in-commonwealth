/* ============================================================
   Cancer in the Commonwealth — Shared Script
   Handles: module step-navigation, progress tracking (saved in
   the browser's localStorage), quizzes, accordions, reveal
   buttons, and reflection notes.
   ============================================================ */

const CIC = (() => {
  const PROGRESS_KEY = "cic_progress";
  const REFLECTIONS_KEY = "cic_reflections";
  const changeListeners = [];

  function notifyChange() {
    changeListeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
  }

  function onChange(fn) {
    changeListeners.push(fn);
  }

  /* ---------- localStorage helpers ---------- */
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(data) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
    } catch (e) {
      /* localStorage unavailable — progress just won't persist */
    }
  }

  function loadReflections() {
    try {
      return JSON.parse(localStorage.getItem(REFLECTIONS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveReflections(data) {
    try {
      localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getModuleProgress(moduleId) {
    const all = loadProgress();
    return all[moduleId] || {
      furthest: 0,
      completed: false,
      pretestScore: null,
      pretestTotal: null,
      posttestScore: null,
      posttestTotal: null,
    };
  }

  function setModuleProgress(moduleId, updates) {
    const all = loadProgress();
    all[moduleId] = Object.assign(getModuleProgress(moduleId), updates);
    saveProgress(all);
    notifyChange();
    return all[moduleId];
  }

  function resetAllProgress() {
    try {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(REFLECTIONS_KEY);
    } catch (e) {}
  }

  /* ---------- full-data helpers (used by the optional accounts module) ---------- */
  function getAllData() {
    return { progress: loadProgress(), reflections: loadReflections() };
  }

  function setAllData(data) {
    if (data && data.progress) saveProgress(data.progress);
    if (data && data.reflections) saveReflections(data.reflections);
  }

  /* ============================================================
     MODULE PAGE NAVIGATION
     ============================================================ */
  function initModule(moduleId) {
    const stage = document.getElementById("screenStage");
    if (!stage) return;
    const screens = Array.from(stage.querySelectorAll(".screen"));
    const total = screens.length;

    const trailTrack = document.getElementById("trailTrack");
    const trailLabel = document.getElementById("trailLabel");
    const progressFill = document.getElementById("progressFill");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    // Build trail dots
    const dots = [];
    screens.forEach((screen, i) => {
      if (i > 0) {
        const line = document.createElement("div");
        line.className = "trail-step__line";
        trailTrack.appendChild(line);
      }
      const step = document.createElement("div");
      step.className = "trail-step";
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "trail-step__dot";
      dot.textContent = String(i + 1);
      dot.setAttribute("aria-label", "Go to: " + (screen.dataset.title || "Section " + (i + 1)));
      dot.addEventListener("click", () => showScreen(i));
      step.appendChild(dot);
      trailTrack.appendChild(step);
      dots.push(dot);
    });

    const progress = getModuleProgress(moduleId);
    let current = Math.min(progress.furthest || 0, total - 1);

    function renderLabels(scroll) {
      const furthest = Math.max(getModuleProgress(moduleId).furthest || 0, current);
      dots.forEach((dot, idx) => {
        dot.classList.toggle("is-active", idx === current);
        dot.classList.toggle("is-done", idx <= furthest);
      });

      const pct = total > 1 ? (current / (total - 1)) * 100 : 100;
      progressFill.style.width = pct + "%";

      const title = screens[current].dataset.title || "";
      trailLabel.innerHTML =
        "Section <span>" + (current + 1) + " of " + total + "</span>" + (title ? " — " + title : "");

      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === total - 1;
      nextBtn.textContent = current === total - 1 ? "End of module" : "Next →";

      if (scroll) {
        const activeDot = dots[current];
        if (activeDot && activeDot.scrollIntoView) {
          activeDot.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }
    }

    function showScreen(i, opts) {
      opts = opts || {};
      current = Math.max(0, Math.min(i, total - 1));
      screens.forEach((s, idx) => {
        s.hidden = idx !== current;
      });

      const prevFurthest = getModuleProgress(moduleId).furthest || 0;
      const furthest = Math.max(prevFurthest, current);
      // Only persist (and trigger sync) when progress actually advances
      if (furthest > prevFurthest) {
        setModuleProgress(moduleId, { furthest });
      }

      renderLabels(true);

      if (opts.scrollStage !== false) {
        window.scrollTo({ top: stage.offsetTop - 90, behavior: "smooth" });
      }
    }

    prevBtn.addEventListener("click", () => showScreen(current - 1));
    nextBtn.addEventListener("click", () => showScreen(current + 1));

    // keyboard navigation (left/right arrows) when not typing in a field
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input") return;
      if (e.key === "ArrowRight" && !nextBtn.disabled) showScreen(current + 1);
      if (e.key === "ArrowLeft" && !prevBtn.disabled) showScreen(current - 1);
    });

    // Initial render without the scroll jump
    screens.forEach((s, idx) => (s.hidden = idx !== current));
    renderLabels(false);

    // If this module was already completed on a previous visit, restore the banner
    if (getModuleProgress(moduleId).completed) {
      const completeBanner = document.getElementById("completeBanner");
      if (completeBanner) completeBanner.hidden = false;
    }

    return { showScreen, total };
  }

  /* ============================================================
     ACCORDIONS  (e.g. risk factor / treatment lists)
     ============================================================ */
  function initAccordions() {
    document.querySelectorAll(".accordion__trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".accordion__item");
        item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", item.classList.contains("is-open"));
      });
    });
  }

  /* ============================================================
     SINGLE-CHOICE ACTIVITIES  (one click, instant feedback)
     Markup:
       <div class="activity">
         <div class="choice-list" data-correct="1">
           <button class="choice">...</button>  (index 0)
           <button class="choice">...</button>  (index 1, correct)
         </div>
         <p class="feedback is-correct-msg">...</p>
         <p class="feedback is-incorrect-msg">...</p>
       </div>
     ============================================================ */
  function initChoiceActivities() {
    document.querySelectorAll(".choice-list:not(.quiz-choices)").forEach((list) => {
      const correctIndex = parseInt(list.dataset.correct, 10);
      const buttons = Array.from(list.querySelectorAll(".choice"));
      const wrap = list.closest(".activity") || list.parentElement;
      const feedbackCorrect = wrap.querySelector(".feedback.is-correct-msg");
      const feedbackIncorrect = wrap.querySelector(".feedback.is-incorrect-msg");

      buttons.forEach((btn, idx) => {
        btn.addEventListener("click", () => {
          if (list.dataset.answered === "true") return;
          list.dataset.answered = "true";

          buttons.forEach((b, i) => {
            b.disabled = true;
            if (i === correctIndex) b.classList.add("is-correct");
          });
          if (idx !== correctIndex) btn.classList.add("is-incorrect");

          if (idx === correctIndex && feedbackCorrect) {
            feedbackCorrect.classList.add("is-visible");
          } else if (feedbackIncorrect) {
            feedbackIncorrect.classList.add("is-visible");
          }
        });
      });
    });
  }

  /* ============================================================
     REVEAL BUTTONS  ("Show the answer" / "Show explanation")
     ============================================================ */
  function initReveals() {
    document.querySelectorAll(".reveal-trigger").forEach((btn) => {
      const targetId = btn.dataset.target;
      const target = document.getElementById(targetId);
      if (!target) return;
      const showText = btn.dataset.showText || "Show explanation";
      const hideText = btn.dataset.hideText || "Hide explanation";
      btn.textContent = showText;
      btn.addEventListener("click", () => {
        const visible = target.classList.toggle("is-visible");
        btn.textContent = visible ? hideText : showText;
      });
    });
  }

  /* ============================================================
     REFLECTION TEXTAREAS  (auto-saved locally)
     ============================================================ */
  function initReflections() {
    const saved = loadReflections();

    document.querySelectorAll(".reflection textarea[data-key]").forEach((ta) => {
      const key = ta.dataset.key;
      if (saved[key]) ta.value = saved[key];

      const note = ta.parentElement.querySelector(".save-note");
      let timeout;
      ta.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const all = loadReflections();
          all[key] = ta.value;
          saveReflections(all);
          notifyChange();
          if (note) {
            note.classList.add("is-visible");
            note.textContent = "Saved on this device";
          }
        }, 500);
      });
    });
  }

  /* ============================================================
     PRE/POST-TESTS
     Markup:
       <div class="quiz" data-test-type="pre" data-bank="module1"
            data-module="module1" data-result="m1pretestResult">
       </div>
       <div class="quiz-result" id="m1pretestResult">
         <p class="eyebrow">Your starting score</p>
         <p class="quiz-result__score">0 / 10</p>
         <p class="quiz-result__msg"></p>
       </div>

     The question bank (window.CIC_TESTS[bank]) is an array of:
       { q, choices: [...], correct: <index>, explanation }

     For a "pre" test, questions render with no explanation and
     choices are marked .is-selected (neutral) when clicked.
     For a "post" test, choices reveal .is-correct / .is-incorrect
     plus the explanation, and the result compares against any
     saved pre-test score.
     ============================================================ */
  function buildQuestionEl(q, index, testType) {
    const qDiv = document.createElement("div");
    qDiv.className = "quiz-question";

    const h3 = document.createElement("h3");
    h3.innerHTML = '<span class="quiz-question__num">' + (index + 1) + ".</span> " + q.q;
    qDiv.appendChild(h3);

    const list = document.createElement("div");
    list.className = "choice-list quiz-choices";
    list.dataset.correct = String(q.correct);
    q.choices.forEach((text) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = text;
      list.appendChild(btn);
    });
    qDiv.appendChild(list);

    if (testType === "post" && q.explanation) {
      const exp = document.createElement("p");
      exp.className = "feedback explanation";
      exp.textContent = q.explanation;
      qDiv.appendChild(exp);
    }

    return qDiv;
  }

  function initTests(moduleId) {
    document.querySelectorAll(".quiz[data-test-type]").forEach((quiz) => {
      const testType = quiz.dataset.testType; // "pre" or "post"
      const bank = (window.CIC_TESTS && window.CIC_TESTS[quiz.dataset.bank]) || [];
      bank.forEach((q, i) => quiz.appendChild(buildQuestionEl(q, i, testType)));

      const questions = Array.from(quiz.querySelectorAll(".quiz-question"));
      const total = questions.length;
      const resultBox = document.getElementById(quiz.dataset.result);
      let answered = 0;
      let score = 0;

      questions.forEach((q) => {
        const list = q.querySelector(".choice-list");
        const correctIndex = parseInt(list.dataset.correct, 10);
        const buttons = Array.from(list.querySelectorAll(".choice"));
        const explanation = q.querySelector(".feedback.explanation");

        buttons.forEach((btn, idx) => {
          btn.addEventListener("click", () => {
            if (list.dataset.answered === "true") return;
            list.dataset.answered = "true";
            answered++;

            buttons.forEach((b) => (b.disabled = true));

            if (testType === "post") {
              buttons[correctIndex].classList.add("is-correct");
              if (idx !== correctIndex) btn.classList.add("is-incorrect");
              if (explanation) explanation.classList.add("is-visible");
            } else {
              btn.classList.add("is-selected");
            }

            if (idx === correctIndex) score++;
            if (answered === total) showResult();
          });
        });
      });

      function showResult() {
        if (!resultBox) return;
        resultBox.classList.add("is-visible");
        const scoreEl = resultBox.querySelector(".quiz-result__score");
        const msgEl = resultBox.querySelector(".quiz-result__msg");
        const compareEl = resultBox.querySelector(".quiz-result__compare");
        if (scoreEl) scoreEl.textContent = score + " / " + total;

        if (testType === "pre") {
          if (msgEl) {
            msgEl.textContent =
              "That's your starting score \u2014 hang onto it. You'll see this same set of questions again at the end of the module.";
          }
          if (moduleId) {
            setModuleProgress(moduleId, { pretestScore: score, pretestTotal: total });
          }
        } else {
          if (msgEl) {
            const pct = score / total;
            let msg;
            if (pct === 1) msg = "Perfect score!";
            else if (pct >= 0.7) msg = "Nice work!";
            else msg = "Good effort \u2014 consider revisiting a section or two using the trail above.";
            msgEl.textContent = msg;
          }

          if (compareEl && moduleId) {
            const progress = getModuleProgress(moduleId);
            if (progress.pretestTotal) {
              const pre = progress.pretestScore;
              const diff = score - pre;
              let diffMsg;
              if (diff > 0) {
                diffMsg = "up " + diff + " question" + (diff === 1 ? "" : "s") + " \u2014 nice growth!";
              } else if (diff === 0) {
                diffMsg = "the same as your starting score.";
              } else {
                diffMsg = "a little lower than your starting score \u2014 that's okay, consider revisiting a section or two.";
              }
              compareEl.innerHTML =
                "Starting score: <strong>" + pre + " / " + progress.pretestTotal + "</strong> &rarr; " +
                "Ending score: <strong>" + score + " / " + total + "</strong> (" + diffMsg + ")";
              compareEl.hidden = false;
            }
          }

          if (moduleId) {
            setModuleProgress(moduleId, { completed: true, posttestScore: score, posttestTotal: total });
          }

          const completeBanner = document.getElementById("completeBanner");
          if (completeBanner) completeBanner.hidden = false;
        }
      }
    });
  }

  /* ============================================================
     INDEX PAGE — module cards with progress
     ============================================================ */
  function initIndexCards() {
    document.querySelectorAll(".module-card").forEach((card) => {
      const moduleId = card.dataset.module;
      const total = parseInt(card.dataset.totalScreens, 10) || 1;
      const progress = getModuleProgress(moduleId);
      const pill = card.querySelector(".status-pill");
      const fill = card.querySelector(".mini-progress__fill");
      const cta = card.querySelector(".module-card__cta");
      const footer = card.querySelector(".module-card__footer");

      let pct = 0;
      if (progress.completed) {
        pct = 100;
        if (pill) { pill.textContent = "Completed"; pill.classList.add("is-complete"); }
        if (cta) cta.textContent = "Review module \u2192";

        // Pre → Post score summary
        if (progress.posttestTotal) {
          const pre = progress.pretestTotal
            ? progress.pretestScore + "/" + progress.pretestTotal
            : "\u2014";
          const post = progress.posttestScore + "/" + progress.posttestTotal;
          const scoreEl = document.createElement("p");
          scoreEl.style.cssText =
            "font-family:var(--font-mono);font-size:0.74rem;" +
            "color:var(--ink-faint);margin-top:-0.25rem;";
          scoreEl.textContent = "Pre: " + pre + " \u2192 Post: " + post;
          if (footer) card.insertBefore(scoreEl, footer);
        }

        // Certificate shortcut
        const certLink = document.createElement("a");
        certLink.href = "certificate.html";
        certLink.textContent = "Get certificate \u2192";
        certLink.style.cssText =
          "font-family:var(--font-mono);font-size:0.74rem;letter-spacing:0.05em;" +
          "color:var(--gold-dark);text-decoration:none;display:block;margin-top:0.3rem;";
        certLink.addEventListener("click", (e) => e.stopPropagation());
        if (footer) card.insertBefore(certLink, footer);

      } else if (progress.furthest > 0) {
        pct = total > 1 ? Math.round((progress.furthest / (total - 1)) * 100) : 0;
        if (pill) { pill.textContent = "In progress"; pill.classList.add("is-progress"); }
      } else {
        if (pill) pill.textContent = "Not started";
      }

      if (fill) fill.style.width = pct + "%";
    });

    const resetBtn = document.getElementById("resetProgress");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("This will clear all saved progress and quiz scores on this device. Continue?")) {
          resetAllProgress();
          location.reload();
        }
      });
    }
  }

  return {
    initModule,
    initAccordions,
    initChoiceActivities,
    initReveals,
    initReflections,
    initTests,
    initIndexCards,
    getModuleProgress,
    setModuleProgress,
    getAllData,
    setAllData,
    onChange,
  };
})();

// Expose globally so the optional account module (loaded as an ES module)
// can read/write progress and listen for changes.
window.CIC = CIC;
