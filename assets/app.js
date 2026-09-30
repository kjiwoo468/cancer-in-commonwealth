/* ============================================================
   Cancer in the Commonwealth — Site Script
   Handles module step-navigation, local progress tracking,
   quizzes, accordions, reveal buttons, reflections, the home
   page module cards, and the certificate page. Auto-initializes
   based on document.body.dataset.page so no per-page inline
   scripts are needed.
   ============================================================ */

const CIC = (() => {
  const PROGRESS_KEY = "cic_progress";
  const REFLECTIONS_KEY = "cic_reflections";

  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch (e) { return {}; }
  }
  function saveJSON(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) { /* storage unavailable — progress just won't persist */ }
  }

  function getModuleProgress(moduleId) {
    const all = loadJSON(PROGRESS_KEY);
    return all[moduleId] || {
      furthest: 0, completed: false,
      pretestScore: null, pretestTotal: null,
      posttestScore: null, posttestTotal: null,
    };
  }
  function setModuleProgress(moduleId, updates) {
    const all = loadJSON(PROGRESS_KEY);
    all[moduleId] = Object.assign(getModuleProgress(moduleId), updates);
    saveJSON(PROGRESS_KEY, all);
    return all[moduleId];
  }
  function resetAllProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); localStorage.removeItem(REFLECTIONS_KEY); }
    catch (e) {}
  }

  /* ============================================================
     MODULE LOCKING — each module requires the previous module's
     posttest to be completed before it can be started.
     ============================================================ */
  const MODULE_SEQUENCE = ["module1", "module2", "module3"];
  const MODULE_LABELS = { module1: "Module 1", module2: "Module 2", module3: "Module 3" };

  function prerequisiteFor(moduleId) {
    const idx = MODULE_SEQUENCE.indexOf(moduleId);
    return idx > 0 ? MODULE_SEQUENCE[idx - 1] : null;
  }
  function isModuleUnlocked(moduleId) {
    const prereq = prerequisiteFor(moduleId);
    return !prereq || !!getModuleProgress(prereq).completed;
  }
  function renderModuleLock(moduleId) {
    const prereq = prerequisiteFor(moduleId);
    const hero = document.querySelector(".module-hero");
    const rail = document.querySelector(".progress-rail");
    const stage = document.getElementById("stage");
    const controls = document.querySelector(".stage-controls");
    if (rail) rail.hidden = true;
    if (stage) stage.hidden = true;
    if (controls) controls.hidden = true;
    if (!hero || !hero.parentNode) return;
    const notice = document.createElement("section");
    notice.className = "section module-lock";
    notice.innerHTML =
      '<div class="container">' +
        '<div class="module-lock__box">' +
          '<span class="module-lock__icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' +
          '</span>' +
          '<h2>Finish ' + MODULE_LABELS[prereq] + ' first</h2>' +
          '<p>' + MODULE_LABELS[moduleId] + ' builds on ' + MODULE_LABELS[prereq] +
          '. Complete its short quiz at the end to unlock this module.</p>' +
          '<a class="btn btn--gold" href="' + prereq + '.html">Go to ' + MODULE_LABELS[prereq] + ' &rarr;</a>' +
        '</div>' +
      '</div>';
    hero.parentNode.insertBefore(notice, hero.nextSibling);
  }

  /* ============================================================
     MODULE STEP NAVIGATION
     ============================================================ */
  function initModule(moduleId) {
    const stage = document.getElementById("stage");
    if (!stage) return;
    const screens = Array.from(stage.querySelectorAll(".screen"));
    const total = screens.length;

    const dotsWrap = document.getElementById("stepDots");
    const railFill = document.getElementById("railFill");
    const railLabel = document.getElementById("railLabel");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    const dots = [];
    screens.forEach((screen, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "step-dot";
      dot.textContent = String(i + 1);
      dot.setAttribute("aria-label", "Go to: " + (screen.dataset.title || "Section " + (i + 1)));
      dot.addEventListener("click", () => showScreen(i));
      if (dotsWrap) dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    const progress = getModuleProgress(moduleId);
    let current = Math.min(progress.furthest || 0, total - 1);

    function render(scroll) {
      const furthest = Math.max(getModuleProgress(moduleId).furthest || 0, current);
      dots.forEach((dot, idx) => {
        dot.classList.toggle("is-active", idx === current);
        dot.classList.toggle("is-done", idx <= furthest);
        dot.disabled = idx > furthest;
      });

      const pct = total > 1 ? (current / (total - 1)) * 100 : 100;
      if (railFill) railFill.style.width = pct + "%";

      if (railLabel) {
        railLabel.innerHTML = "Section <span>" + (current + 1) + " / " + total + "</span>";
      }

      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === total - 1;
      nextBtn.textContent = current === total - 1 ? "End of module" : "Next →";

      if (scroll && dots[current] && dots[current].scrollIntoView) {
        dots[current].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }

    function showScreen(i) {
      current = Math.max(0, Math.min(i, total - 1));
      screens.forEach((s, idx) => { s.hidden = idx !== current; });

      const prevFurthest = getModuleProgress(moduleId).furthest || 0;
      const furthest = Math.max(prevFurthest, current);
      if (furthest > prevFurthest) setModuleProgress(moduleId, { furthest });

      render(true);
      window.scrollTo({ top: stage.offsetTop - 130, behavior: "smooth" });
    }

    prevBtn.addEventListener("click", () => showScreen(current - 1));
    nextBtn.addEventListener("click", () => showScreen(current + 1));

    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input" || tag === "select") return;
      if (e.key === "ArrowRight" && !nextBtn.disabled) showScreen(current + 1);
      if (e.key === "ArrowLeft" && !prevBtn.disabled) showScreen(current - 1);
    });

    screens.forEach((s, idx) => (s.hidden = idx !== current));
    render(false);

    if (getModuleProgress(moduleId).completed) {
      const banner = document.getElementById("completeBanner");
      if (banner) banner.hidden = false;
    }
  }

  /* ============================================================
     ACCORDIONS
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
     CARD PICKERS  (icon/number grid -> single detail panel below)
     Markup:
       <div class="card-picker">
         <div class="card-picker__grid">
           <button class="card-picker__btn" data-target="id1">...</button>
           ...
         </div>
         <div class="card-picker__panels">
           <div class="card-picker__panel" id="id1">...</div>
           ...
         </div>
       </div>
     ============================================================ */
  function initCardPickers() {
    document.querySelectorAll(".card-picker").forEach((picker) => {
      const buttons = Array.from(picker.querySelectorAll(".card-picker__btn"));
      const panels = Array.from(picker.querySelectorAll(".card-picker__panel"));
      function select(id) {
        buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.target === id));
        panels.forEach((p) => p.classList.toggle("is-active", p.id === id));
      }
      buttons.forEach((b) => b.addEventListener("click", () => select(b.dataset.target)));
      if (buttons[0]) select(buttons[0].dataset.target);
    });
  }

  /* ============================================================
     SORT QUIZ  (independent tap-to-reveal chips)
     Markup:
       <div class="sort-grid">
         <button class="sort-chip" data-answer="protective">
           <span class="sort-chip__badge"></span>
           <span class="sort-chip__text">
             <strong>Label</strong>
             <span class="sort-chip__reason">Shown after tapping.</span>
           </span>
         </button>
       </div>
     ============================================================ */
  function initSortChips() {
    document.querySelectorAll(".sort-grid").forEach((grid) => {
      const chips = Array.from(grid.querySelectorAll(".sort-chip"));
      const tally = grid.parentElement.querySelector(".sort-tally");
      let protective = 0, risky = 0;

      function updateTally() {
        if (!tally) return;
        const pEl = tally.querySelector('[data-count="protective"]');
        const rEl = tally.querySelector('[data-count="risky"]');
        if (pEl) pEl.textContent = protective;
        if (rEl) rEl.textContent = risky;
      }

      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          if (chip.dataset.answered === "true") return;
          chip.dataset.answered = "true";
          chip.disabled = true;
          const answer = chip.dataset.answer;
          chip.classList.add(answer === "protective" ? "is-protective" : "is-risky");
          const badge = chip.querySelector(".sort-chip__badge");
          if (badge) badge.textContent = answer === "protective" ? "✓" : "!";
          if (answer === "protective") protective++; else risky++;
          updateTally();
        });
      });
    });
  }

  /* ============================================================
     DRAG ENGINE  (shared pointer-based drag, mouse + touch)
     Works alongside a click-to-select / click-to-place fallback
     so every drag activity is also fully usable without dragging.
     ============================================================ */
  function makeDraggable(el, dropSelector, onDrop) {
    let dragging = false;
    let moved = false;
    let offsetX = 0, offsetY = 0;
    const DRAG_THRESHOLD = 4; // px — below this, treat as a click, not a drag
    let startX = 0, startY = 0;

    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      el.style.width = rect.width + "px";
      el.style.left = rect.left + "px";
      el.style.top = rect.top + "px";
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });

    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) {
        moved = true;
        // Note: deliberately NOT reparenting to document.body here. Moving a
        // pointer-captured element to a new parent mid-drag causes Chrome to
        // silently drop pointer capture — combined with pointer-events:none
        // on .is-dragging, the element would then never receive another
        // event and get stranded mid-drag. position:fixed alone is enough
        // to render above everything, since no ancestor here creates a
        // containing block (no transform/filter/perspective).
        el.classList.add("is-dragging");
      }
      if (!moved) return;
      el.style.left = (e.clientX - offsetX) + "px";
      el.style.top = (e.clientY - offsetY) + "px";
      document.querySelectorAll(dropSelector).forEach((d) => d.classList.remove("is-drag-over"));
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const drop = under && under.closest(dropSelector);
      if (drop) drop.classList.add("is-drag-over");
    });

    function finishDrag(e) {
      if (!dragging) return;
      dragging = false;
      document.querySelectorAll(dropSelector).forEach((d) => d.classList.remove("is-drag-over"));
      if (!moved) { el.style.width = ""; return; } // no real drag — let the click handler run instead
      el.classList.remove("is-dragging");
      el.style.position = ""; el.style.left = ""; el.style.top = ""; el.style.width = "";
      el.dataset.justDragged = "1";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const drop = under && under.closest(dropSelector);
      onDrop(el, drop);
    }
    el.addEventListener("pointerup", finishDrag);
    el.addEventListener("pointercancel", finishDrag);
  }

  // Wrap a click handler so it's skipped for the synthetic click that
  // follows a real drag-and-drop on the same element.
  function onClickIfNotDragged(el, handler) {
    el.addEventListener("click", (e) => {
      if (el.dataset.justDragged === "1") { delete el.dataset.justDragged; return; }
      handler(e);
    });
  }

  /* ============================================================
     DRAG SEQUENCE  (put shuffled cards into the correct order)
     Markup:
       <div class="drag-sequence" data-order="a,b,c">
         <div class="drag-sequence__tray">
           <div class="drag-card" data-id="a">...</div>...
         </div>
         <div class="drag-sequence__slots">
           <div class="drag-slot" data-slot="0"><span class="drag-slot__num">1</span></div>...
         </div>
         <button class="btn btn--ghost btn--sm">Check my order</button>
         <p class="feedback is-correct-msg">...</p>
         <p class="feedback is-incorrect-msg">...</p>
       </div>
     ============================================================ */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function initDragSequences() {
    document.querySelectorAll(".drag-sequence").forEach((seq) => {
      const tray = seq.querySelector(".drag-sequence__tray");
      const slots = Array.from(seq.querySelectorAll(".drag-slot"));
      const cards = Array.from(seq.querySelectorAll(".drag-card"));
      const checkBtn = seq.querySelector(".drag-sequence__check");
      const correctMsg = seq.querySelector(".feedback.is-correct-msg");
      const incorrectMsg = seq.querySelector(".feedback.is-incorrect-msg");
      let selected = null;

      shuffle(cards).forEach((c) => tray.appendChild(c));

      function clearFeedback() {
        if (correctMsg) correctMsg.classList.remove("is-visible");
        if (incorrectMsg) incorrectMsg.classList.remove("is-visible");
        slots.forEach((s) => s.classList.remove("is-correct", "is-incorrect"));
      }

      function placeCard(card, slot) {
        const existing = slot.querySelector(".drag-card");
        if (existing && existing !== card) tray.appendChild(existing);
        slot.appendChild(card);
        clearFeedback();
      }

      function selectCard(card) {
        if (selected) selected.classList.remove("is-selected");
        if (selected === card) { selected = null; return; }
        selected = card;
        card.classList.add("is-selected");
      }

      cards.forEach((card) => {
        onClickIfNotDragged(card, () => {
          if (card.parentElement.classList.contains("drag-slot")) {
            tray.appendChild(card);
            clearFeedback();
            return;
          }
          selectCard(card);
        });
        makeDraggable(card, ".drag-slot, .drag-sequence__tray", (el, drop) => {
          if (drop && drop.classList.contains("drag-slot")) placeCard(el, drop);
          else tray.appendChild(el);
        });
      });

      slots.forEach((slot) => {
        slot.addEventListener("click", () => {
          if (selected) {
            placeCard(selected, slot);
            selected.classList.remove("is-selected");
            selected = null;
          }
        });
      });

      if (checkBtn) {
        checkBtn.addEventListener("click", () => {
          const order = slots.map((s) => {
            const c = s.querySelector(".drag-card");
            return c ? c.dataset.id : null;
          });
          if (order.includes(null)) {
            slots.forEach((s, i) => { if (order[i] === null) s.classList.add("is-incorrect"); });
            return;
          }
          const answer = seq.dataset.order.split(",");
          const isCorrect = order.every((id, i) => id === answer[i]);
          slots.forEach((s, i) => s.classList.add(order[i] === answer[i] ? "is-correct" : "is-incorrect"));
          if (isCorrect) { if (correctMsg) correctMsg.classList.add("is-visible"); if (incorrectMsg) incorrectMsg.classList.remove("is-visible"); }
          else if (incorrectMsg) incorrectMsg.classList.add("is-visible");
        });
      }
    });
  }

  /* ============================================================
     DRAG SORT  (drop chips into one of two bins, instant feedback)
     Markup:
       <div class="drag-sort">
         <div class="drag-sort__tray">
           <div class="drag-chip" data-answer="a">...</div>...
         </div>
         <div class="drag-sort__bins">
           <div class="drag-bin drag-bin--a" data-bin="a">...</div>
           <div class="drag-bin drag-bin--b" data-bin="b">...</div>
         </div>
       </div>
     ============================================================ */
  function initDragSorts() {
    document.querySelectorAll(".drag-sort").forEach((sortEl) => {
      const tray = sortEl.querySelector(".drag-sort__tray");
      const bins = Array.from(sortEl.querySelectorAll(".drag-bin"));
      const chips = Array.from(sortEl.querySelectorAll(".drag-chip"));
      const statusEl = sortEl.querySelector(".drag-sort__status");
      let selected = null;
      let correctCount = 0;

      shuffle(chips).forEach((c) => tray.appendChild(c));

      function updateStatus() {
        if (!statusEl) return;
        statusEl.innerHTML = correctCount >= chips.length
          ? "🎉 All sorted correctly!"
          : "Sorted correctly: <strong>" + correctCount + " / " + chips.length + "</strong>";
      }

      function evaluate(chip, bin) {
        const wasCorrect = chip.classList.contains("is-correct");
        chip.classList.remove("is-correct", "is-incorrect");
        const isCorrect = bin && chip.dataset.answer === bin.dataset.bin;
        chip.classList.add(isCorrect ? "is-correct" : "is-incorrect");
        if (isCorrect && !wasCorrect) correctCount++;
        else if (!isCorrect && wasCorrect) correctCount--;
        updateStatus();
      }

      function returnToTray(chip) {
        const wasCorrect = chip.classList.contains("is-correct");
        tray.appendChild(chip);
        chip.classList.remove("is-correct", "is-incorrect");
        if (wasCorrect) { correctCount--; updateStatus(); }
      }

      function selectChip(chip) {
        if (selected) selected.classList.remove("is-selected");
        if (selected === chip) { selected = null; return; }
        selected = chip;
        chip.classList.add("is-selected");
      }

      chips.forEach((chip) => {
        onClickIfNotDragged(chip, () => {
          if (chip.parentElement.classList.contains("drag-bin")) {
            returnToTray(chip);
            return;
          }
          selectChip(chip);
        });
        makeDraggable(chip, ".drag-bin, .drag-sort__tray", (el, drop) => {
          if (drop && drop.classList.contains("drag-bin")) {
            drop.appendChild(el);
            evaluate(el, drop);
          } else {
            returnToTray(el);
          }
        });
      });

      bins.forEach((bin) => {
        bin.addEventListener("click", () => {
          if (selected) {
            bin.appendChild(selected);
            evaluate(selected, bin);
            selected.classList.remove("is-selected");
            selected = null;
          }
        });
      });

      updateStatus();
    });
  }

  /* ============================================================
     SINGLE-CHOICE ACTIVITIES
     Answers can be changed any time — clicking a different choice
     re-scores it instead of locking after the first click.
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
          buttons.forEach((b) => b.classList.remove("is-correct", "is-incorrect"));
          buttons[correctIndex].classList.add("is-correct");
          if (idx !== correctIndex) btn.classList.add("is-incorrect");

          if (idx === correctIndex) {
            if (feedbackCorrect) feedbackCorrect.classList.add("is-visible");
            if (feedbackIncorrect) feedbackIncorrect.classList.remove("is-visible");
          } else {
            if (feedbackIncorrect) feedbackIncorrect.classList.add("is-visible");
            if (feedbackCorrect) feedbackCorrect.classList.remove("is-visible");
          }
        });
      });
    });
  }

  /* ============================================================
     REVEAL BUTTONS
     ============================================================ */
  function initReveals() {
    document.querySelectorAll(".reveal-btn").forEach((btn) => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const showText = btn.dataset.showText || "Show more";
      const hideText = btn.dataset.hideText || "Hide";
      btn.textContent = showText;
      btn.addEventListener("click", () => {
        const visible = target.classList.toggle("is-visible");
        btn.textContent = visible ? hideText : showText;
      });
    });
  }

  /* ============================================================
     REFLECTION TEXTAREAS
     ============================================================ */
  function initReflections() {
    const saved = loadJSON(REFLECTIONS_KEY);
    document.querySelectorAll(".journal textarea[data-key]").forEach((ta) => {
      const key = ta.dataset.key;
      if (saved[key]) ta.value = saved[key];
      const note = ta.closest(".journal").querySelector(".journal__note");
      let timeout;
      ta.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const all = loadJSON(REFLECTIONS_KEY);
          all[key] = ta.value;
          saveJSON(REFLECTIONS_KEY, all);
          if (note) { note.classList.add("is-visible"); note.textContent = "Saved on this device"; }
        }, 500);
      });
    });
  }

  /* ============================================================
     PRE/POST QUIZZES
     Like the activities above, answers can be changed at any
     time — the result box (once all questions have been
     answered at least once) recomputes live as answers change.
     ============================================================ */
  function buildQuestionEl(q, index, testType) {
    const qDiv = document.createElement("div");
    qDiv.className = "quiz-q";

    const h3 = document.createElement("h3");
    h3.innerHTML = '<span class="quiz-q__num">' + (index + 1) + ".</span>" + q.q;
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

  function initQuizzes(moduleId) {
    document.querySelectorAll(".quiz[data-test-type]").forEach((quiz) => {
      const testType = quiz.dataset.testType;
      const bank = (window.CIC_QUIZ_DATA && window.CIC_QUIZ_DATA[quiz.dataset.bank]) || [];
      bank.forEach((q, i) => quiz.appendChild(buildQuestionEl(q, i, testType)));

      const questions = Array.from(quiz.querySelectorAll(".quiz-q"));
      const total = questions.length;
      const resultBox = document.getElementById(quiz.dataset.result);
      const answers = new Array(total).fill(null);

      questions.forEach((q, qIndex) => {
        const list = q.querySelector(".choice-list");
        const correctIndex = parseInt(list.dataset.correct, 10);
        const buttons = Array.from(list.querySelectorAll(".choice"));
        const explanation = q.querySelector(".feedback.explanation");

        buttons.forEach((btn, idx) => {
          btn.addEventListener("click", () => {
            answers[qIndex] = idx;
            buttons.forEach((b) => b.classList.remove("is-correct", "is-incorrect", "is-selected"));

            if (testType === "post") {
              buttons[correctIndex].classList.add("is-correct");
              if (idx !== correctIndex) btn.classList.add("is-incorrect");
              if (explanation) explanation.classList.add("is-visible");
            } else {
              btn.classList.add("is-selected");
            }

            if (answers.every((a) => a !== null)) showResult();
          });
        });
      });

      function showResult() {
        if (!resultBox) return;
        const score = questions.reduce((sum, q, i) => {
          const correctIndex = parseInt(q.querySelector(".choice-list").dataset.correct, 10);
          return sum + (answers[i] === correctIndex ? 1 : 0);
        }, 0);
        resultBox.classList.add("is-visible");
        const scoreEl = resultBox.querySelector(".quiz-result__score");
        const msgEl = resultBox.querySelector(".quiz-result__msg");
        const compareEl = resultBox.querySelector(".quiz-result__compare");
        if (scoreEl) scoreEl.textContent = score + " / " + total;

        if (testType === "pre") {
          if (msgEl) msgEl.textContent = "That's your starting score — hang onto it. You'll see this same set of questions again at the end of the module.";
          if (moduleId) setModuleProgress(moduleId, { pretestScore: score, pretestTotal: total });
        } else {
          if (msgEl) {
            const pct = score / total;
            msgEl.textContent = pct === 1 ? "Perfect score!" : pct >= 0.7 ? "Nice work!" : "Good effort — consider revisiting a section or two using the trail above.";
          }
          if (compareEl && moduleId) {
            const progress = getModuleProgress(moduleId);
            if (progress.pretestTotal) {
              const pre = progress.pretestScore;
              const diff = score - pre;
              const diffMsg = diff > 0
                ? "up " + diff + " question" + (diff === 1 ? "" : "s") + " — nice growth!"
                : diff === 0
                ? "the same as your starting score."
                : "a little lower than your starting score — that's okay, consider revisiting a section or two.";
              compareEl.innerHTML = "Starting score: <strong>" + pre + " / " + progress.pretestTotal + "</strong> &rarr; Ending score: <strong>" + score + " / " + total + "</strong> (" + diffMsg + ")";
              compareEl.hidden = false;
            }
          }
          if (moduleId) setModuleProgress(moduleId, { completed: true, posttestScore: score, posttestTotal: total });
          const banner = document.getElementById("completeBanner");
          if (banner) banner.hidden = false;
        }
      }
    });
  }

  /* ============================================================
     HOME PAGE — module cards + reset button
     ============================================================ */
  function initHomeCards() {
    document.querySelectorAll(".module-card").forEach((card) => {
      const moduleId = card.dataset.module;
      const total = parseInt(card.dataset.totalScreens, 10) || 1;
      const progress = getModuleProgress(moduleId);
      const pill = card.querySelector(".pill");
      const fill = card.querySelector(".mini-bar__fill");
      const cta = card.querySelector(".module-card__cta");
      const foot = card.querySelector(".module-card__foot");

      let pct = 0;
      if (progress.completed) {
        pct = 100;
        if (pill) { pill.textContent = "Completed"; pill.classList.add("pill--done"); }
        if (cta) cta.textContent = "Review module →";

        if (progress.posttestTotal) {
          const pre = progress.pretestTotal ? progress.pretestScore + "/" + progress.pretestTotal : "—";
          const post = progress.posttestScore + "/" + progress.posttestTotal;
          const scoreEl = document.createElement("p");
          scoreEl.className = "module-card__score";
          scoreEl.textContent = "Pre: " + pre + " → Post: " + post;
          card.insertBefore(scoreEl, foot);
        }
        const certLink = document.createElement("a");
        certLink.href = "certificate.html";
        certLink.className = "module-card__cert";
        certLink.textContent = "Get certificate →";
        certLink.addEventListener("click", (e) => e.stopPropagation());
        card.insertBefore(certLink, foot);
      } else if (progress.furthest > 0) {
        pct = total > 1 ? Math.round((progress.furthest / (total - 1)) * 100) : 0;
        if (pill) { pill.textContent = "In progress"; pill.classList.add("pill--progress"); }
      } else if (pill) {
        pill.textContent = "Not started";
      }
      if (fill) fill.style.width = pct + "%";

      const prereq = prerequisiteFor(moduleId);
      if (prereq && !getModuleProgress(prereq).completed) {
        card.classList.add("module-card--locked");
        card.setAttribute("aria-disabled", "true");
        card.title = "Complete " + MODULE_LABELS[prereq] + " first";
        if (pill) {
          pill.textContent = "Locked";
          pill.classList.remove("pill--progress", "pill--done");
          pill.classList.add("pill--locked");
        }
        if (cta) cta.textContent = "Complete " + MODULE_LABELS[prereq] + " first";
        card.addEventListener("click", (e) => e.preventDefault());
      }
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

  /* ============================================================
     CERTIFICATE PAGE
     ============================================================ */
  function initCertificatePage() {
    const MODULES = [
      { id: "module1", title: "Cancer Basics & Health Disparities", short: "Module 1" },
      { id: "module2", title: "Risk Factors & Modifiable Behaviors", short: "Module 2" },
      { id: "module3", title: "Diagnosis & Treatment", short: "Module 3" },
    ];
    const nameInput = document.getElementById("certName");
    const select = document.getElementById("certSelect");
    const output = document.getElementById("certificateOutput");
    const printBtn = document.getElementById("certPrintBtn");
    const emptyState = document.getElementById("certEmptyState");
    const controls = document.getElementById("certControls");
    if (!output) return;

    const NAME_KEY = "cic_cert_name";

    function completedModules() {
      return MODULES.filter((m) => getModuleProgress(m.id).completed);
    }
    function formatDate() {
      return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }
    function escapeHTML(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }
    function seal() {
      return '<svg class="certificate__seal" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<circle cx="20" cy="20" r="18" fill="none" stroke="#0033a0" stroke-width="2"/>' +
        '<circle cx="20" cy="20" r="11" fill="#e7ecf8"/>' +
        '<path d="M13 20l5 5 9-11" fill="none" stroke="#0033a0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>";
    }

    function render() {
      const name = (nameInput.value || "").trim() || "________________________";
      const value = select.value;
      if (!value) { output.classList.remove("is-visible"); printBtn.hidden = true; return; }
      output.classList.add("is-visible");
      printBtn.hidden = false;

      let bodyHTML = "", scoresHTML = "";

      if (value === "full") {
        bodyHTML = "has successfully completed all three modules of the <strong>Cancer in the Commonwealth</strong> curriculum — Cancer Basics &amp; Health Disparities, Risk Factors &amp; Modifiable Behaviors, and Diagnosis &amp; Treatment — including the pre- and post-assessment for each module.";
        scoresHTML = MODULES.map((m) => {
          const p = getModuleProgress(m.id);
          const pre = p.pretestTotal ? p.pretestScore + "/" + p.pretestTotal : "—";
          const post = p.posttestTotal ? p.posttestScore + "/" + p.posttestTotal : "—";
          return '<span class="pill pill--done">' + m.short + ": " + pre + " → " + post + "</span>";
        }).join("");
      } else {
        const m = MODULES.find((m) => m.id === value);
        const p = getModuleProgress(value);
        const pre = p.pretestTotal ? p.pretestScore + "/" + p.pretestTotal : null;
        const post = p.posttestTotal ? p.posttestScore + "/" + p.posttestTotal : null;
        bodyHTML = "has successfully completed <strong>" + m.title + "</strong>, part of the <strong>Cancer in the Commonwealth</strong> curriculum" +
          (post ? ", scoring " + post + " on the post-assessment" + (pre ? " (starting score: " + pre + ")" : "") : "") + ".";
        if (post) {
          scoresHTML = '<span class="pill pill--done">Starting score: ' + (pre || "—") + '</span><span class="pill pill--done">Ending score: ' + post + "</span>";
        }
      }

      output.innerHTML = seal() +
        '<p class="certificate__eyebrow">Certificate of Completion</p>' +
        "<h1>Cancer in the Commonwealth</h1>" +
        '<p class="certificate__name">' + escapeHTML(name) + "</p>" +
        '<p class="certificate__body">' + bodyHTML + "</p>" +
        '<div class="certificate__scores">' + scoresHTML + "</div>" +
        '<div class="certificate__footer">' +
        '<div class="certificate__sig"><div class="certificate__sig-value">' + formatDate() + '</div><div class="certificate__sig-line">Date Completed</div></div>' +
        '<div class="certificate__sig"><div class="certificate__sig-value">&nbsp;</div><div class="certificate__sig-line">Program Facilitator</div></div>' +
        "</div>";
    }

    function populateSelect() {
      const completed = completedModules();
      select.innerHTML = "";
      if (completed.length === 0) {
        emptyState.hidden = false; controls.hidden = true; output.classList.remove("is-visible"); printBtn.hidden = true;
        return;
      }
      emptyState.hidden = true; controls.hidden = false;
      const placeholder = document.createElement("option");
      placeholder.value = ""; placeholder.textContent = "Choose a certificate…";
      select.appendChild(placeholder);
      completed.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id; opt.textContent = m.title;
        select.appendChild(opt);
      });
      if (completed.length === MODULES.length) {
        const opt = document.createElement("option");
        opt.value = "full"; opt.textContent = "Full course (all three modules)";
        select.appendChild(opt);
        select.value = "full";
      } else {
        select.value = completed[completed.length - 1].id;
      }
    }

    try {
      const savedName = localStorage.getItem(NAME_KEY);
      if (savedName) nameInput.value = savedName;
    } catch (e) {}

    nameInput.addEventListener("input", () => {
      try { localStorage.setItem(NAME_KEY, nameInput.value); } catch (e) {}
      render();
    });
    select.addEventListener("change", render);
    printBtn.addEventListener("click", () => window.print());

    populateSelect();
    render();
  }

  /* ============================================================
     SIGN-IN (username + password + county + school)
     Talks to a university-hosted auth server once one is
     configured in assets/api-config.js (window.CIC_API_BASE_URL).
     The exact request/response contract those two endpoints must
     implement is documented in API-CONTRACT.md.

     Until CIC_API_BASE_URL is set, sign-in falls back to the
     site's original local-only behavior: no real password check,
     just a name remembered on this device — so the site keeps
     working normally before IT sets anything up.
     ============================================================ */
  const LOGIN_KEY = "cic_login";

  function getLoginInfo() {
    try { return JSON.parse(localStorage.getItem(LOGIN_KEY)) || null; }
    catch (e) { return null; }
  }
  function saveLoginInfo(info) {
    try { localStorage.setItem(LOGIN_KEY, JSON.stringify(info)); } catch (e) {}
  }
  function clearLoginInfo() {
    try { localStorage.removeItem(LOGIN_KEY); } catch (e) {}
  }

  // POSTs to {CIC_API_BASE_URL}/auth/register or /auth/login. See
  // API-CONTRACT.md for the request/response shape both endpoints
  // must implement, including error codes.
  async function callAuthServer(path, payload) {
    const baseUrl = window.CIC_API_BASE_URL || "";
    const res = await fetch(baseUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body = null;
    try { body = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error((body && body.message) || "Request failed");
      err.code = body && body.error;
      err.status = res.status;
      throw err;
    }
    return body || {};
  }

  function authErrorMessage(err) {
    if (err.code === "username_taken") return "That username is already taken.";
    if (err.code === "invalid_credentials") return "Incorrect username or password.";
    if (err.code === "invalid_input") return err.message || "Please check your information and try again.";
    if (err.status) return "Something went wrong on the server. Please try again.";
    return "Couldn't reach the server. Check your connection and try again.";
  }

  function initLogin() {
    const loginBtn = document.getElementById("loginBtn");
    const modal = document.getElementById("loginModal");
    if (!loginBtn || !modal) return;

    const closeBtn = document.getElementById("loginModalClose");
    const form = document.getElementById("loginForm");
    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");
    const passwordToggle = document.getElementById("loginPasswordToggle");
    const countySelect = document.getElementById("loginCounty");
    const schoolInput = document.getElementById("loginSchool");
    const errorEl = document.getElementById("loginError");
    const continueGuestBtn = document.getElementById("loginContinueGuest");
    const statusEl = document.getElementById("loginStatus");
    const signInBtn = document.getElementById("loginSignInBtn");
    const registerBtn = document.getElementById("loginRegisterBtn");

    if (passwordToggle && passwordInput) {
      passwordToggle.addEventListener("click", () => {
        const showing = passwordInput.type === "text";
        passwordInput.type = showing ? "password" : "text";
        passwordToggle.textContent = showing ? "Show" : "Hide";
        passwordToggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    }

    function escapeHTML(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function renderStatus() {
      const info = getLoginInfo();
      if (info) {
        loginBtn.hidden = true;
        statusEl.hidden = false;
        statusEl.innerHTML =
          "Signed in as <strong>" + escapeHTML(info.username) + "</strong>" +
          '<button type="button" class="login-status__signout" id="loginSignOut">Sign out</button>';
        const signOutBtn = document.getElementById("loginSignOut");
        if (signOutBtn) {
          signOutBtn.addEventListener("click", () => {
            clearLoginInfo();
            renderStatus();
          });
        }
      } else {
        loginBtn.hidden = false;
        statusEl.hidden = true;
        statusEl.innerHTML = "";
      }
    }

    function clearMessage() {
      if (errorEl) { errorEl.hidden = true; errorEl.textContent = ""; }
    }
    function showMessage(text) {
      if (errorEl) { errorEl.textContent = text; errorEl.hidden = false; }
    }
    function setBusy(busy) {
      if (signInBtn) signInBtn.disabled = busy;
      if (registerBtn) registerBtn.disabled = busy;
    }

    function openModal() {
      modal.hidden = false;
      clearMessage();
      if (usernameInput) usernameInput.focus();
    }
    function closeModal() {
      modal.hidden = true;
      clearMessage();
      if (passwordInput) passwordInput.value = "";
    }

    loginBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
    if (continueGuestBtn) continueGuestBtn.addEventListener("click", closeModal);

    async function handleAuth(mode) {
      clearMessage();
      const username = (usernameInput.value || "").trim();
      const password = passwordInput ? passwordInput.value : "";
      const county = countySelect.value;
      const school = (schoolInput.value || "").trim();

      if (!username || !password) {
        showMessage("Username and password are required.");
        return;
      }
      if (mode === "register" && (!county || !school)) {
        showMessage("County and school are required to create an account.");
        return;
      }

      // No server configured yet — keep the site usable with the
      // original local-only behavior (no real password check).
      if (!window.CIC_API_BASE_URL) {
        saveLoginInfo({ username, county, school, signedInAt: new Date().toISOString() });
        if (passwordInput) passwordInput.value = "";
        closeModal();
        renderStatus();
        return;
      }

      setBusy(true);
      try {
        const path = mode === "register" ? "/auth/register" : "/auth/login";
        const payload = mode === "register"
          ? { username, password, county, school }
          : { username, password };
        const result = await callAuthServer(path, payload);
        saveLoginInfo({
          username: result.username || username,
          county: result.county || county,
          school: result.school || school,
          token: result.token || null,
          signedInAt: new Date().toISOString(),
        });
        if (passwordInput) passwordInput.value = "";
        closeModal();
        renderStatus();
      } catch (err) {
        showMessage(authErrorMessage(err));
      } finally {
        setBusy(false);
      }
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleAuth("login");
      });
    }
    if (registerBtn) {
      registerBtn.addEventListener("click", () => handleAuth("register"));
    }

    renderStatus();
  }

  /* ============================================================
     3D TILT — pointer-tracked depth effect for module cards and
     diagrams. Sets --tilt-x/--tilt-y custom properties that the
     CSS reads to rotate the element toward the cursor.
     ============================================================ */
  function initTilt3D(surfaceSelector, opts = {}) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const maxTilt = opts.maxTilt || 8;
    document.querySelectorAll(surfaceSelector).forEach((surface) => {
      const target = opts.target ? surface.querySelector(opts.target) : surface;
      if (!target) return;
      surface.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const rect = surface.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * maxTilt;
        const ry = (px - 0.5) * maxTilt;
        target.style.setProperty("--tilt-x", rx.toFixed(2) + "deg");
        target.style.setProperty("--tilt-y", ry.toFixed(2) + "deg");
      });
      surface.addEventListener("pointerleave", () => {
        target.style.setProperty("--tilt-x", "0deg");
        target.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  /* ============================================================
     RISK CALCULATOR — renders the question bank from
     risk-calc-data.js, tracks answers, scores on submit, and
     renders a results breakdown + gauge. See risk-calculator.html.
     ============================================================ */
  function initRiskCalculator() {
    const form = document.getElementById("calcForm");
    const submitBtn = document.getElementById("calcSubmit");
    const progressEl = document.getElementById("calcProgress");
    const resultWrap = document.getElementById("calcResult");
    const retakeBtn = document.getElementById("calcRetake");
    if (!form || typeof RISK_CALC_QUESTIONS === "undefined") return;

    const answers = {};
    let totalQuestions = 0;
    const allButtonGroups = [];

    RISK_CALC_QUESTIONS.forEach((section) => {
      const sectionEl = document.createElement("div");
      sectionEl.className = "calc-section";

      const heading = document.createElement("h3");
      heading.className = "calc-section__title";
      heading.textContent = section.section;
      sectionEl.appendChild(heading);

      if (section.intro) {
        const introEl = document.createElement("p");
        introEl.className = "calc-section__intro";
        introEl.textContent = section.intro;
        sectionEl.appendChild(introEl);
      }

      section.items.forEach((item) => {
        totalQuestions++;
        const qEl = document.createElement("div");
        qEl.className = "calc-q";

        const promptEl = document.createElement("p");
        promptEl.className = "calc-q__prompt";
        promptEl.textContent = item.prompt;
        qEl.appendChild(promptEl);

        if (item.note) {
          const noteEl = document.createElement("p");
          noteEl.className = "calc-q__note";
          noteEl.textContent = item.note;
          qEl.appendChild(noteEl);
        }

        const listEl = document.createElement("div");
        listEl.className = "choice-list";
        listEl.setAttribute("role", "radiogroup");
        listEl.setAttribute("aria-label", item.prompt);

        const buttons = [];
        item.choices.forEach((choice) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "choice";
          btn.textContent = choice.label;
          btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("is-selected"));
            btn.classList.add("is-selected");
            answers[item.id] = {
              points: item.contextOnly ? 0 : (choice.points || 0),
              detail: choice.label,
              short: item.contextOnly ? null : item.short,
            };
            updateProgress();
          });
          buttons.push(btn);
          listEl.appendChild(btn);
        });
        allButtonGroups.push(buttons);

        qEl.appendChild(listEl);
        sectionEl.appendChild(qEl);
      });

      form.appendChild(sectionEl);
    });

    function updateProgress() {
      const answered = Object.keys(answers).length;
      if (progressEl) progressEl.textContent = answered + " of " + totalQuestions + " answered";
      if (submitBtn) submitBtn.disabled = answered < totalQuestions;
    }
    updateProgress();

    function renderResult(score, tier, positives, negatives) {
      if (!resultWrap) return;
      resultWrap.hidden = false;
      const resultBox = resultWrap.querySelector(".calc-result__box");
      if (resultBox) resultBox.dataset.tone = tier.tone;

      const tierEl = resultWrap.querySelector(".calc-result__tier");
      if (tierEl) tierEl.textContent = tier.label;

      const needle = document.getElementById("calcNeedle");
      if (needle) {
        const idx = RISK_CALC_TIERS.indexOf(tier);
        const angle = -80 + idx * (160 / (RISK_CALC_TIERS.length - 1));
        needle.style.transform = "rotate(" + angle + "deg)";
      }

      function fillList(el, items, emptyText) {
        if (!el) return;
        el.innerHTML = "";
        if (!items.length) {
          const li = document.createElement("li");
          li.className = "calc-result__empty";
          li.textContent = emptyText;
          el.appendChild(li);
          return;
        }
        items.forEach((it) => {
          const li = document.createElement("li");
          li.innerHTML = "<strong>" + it.label + "</strong> — " + it.detail;
          el.appendChild(li);
        });
      }
      fillList(resultWrap.querySelector(".calc-result__up"), positives, "No major risk-raising factors from your answers.");
      fillList(resultWrap.querySelector(".calc-result__down"), negatives, "No risk-lowering factors from your answers yet.");

      resultWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        let score = 0;
        const positives = [];
        const negatives = [];
        Object.keys(answers).forEach((id) => {
          const a = answers[id];
          if (!a.short) return;
          score += a.points;
          if (a.points > 0) positives.push({ label: a.short, detail: a.detail, points: a.points });
          if (a.points < 0) negatives.push({ label: a.short, detail: a.detail, points: a.points });
        });
        positives.sort((a, b) => b.points - a.points);
        negatives.sort((a, b) => a.points - b.points);

        const tier = RISK_CALC_TIERS.find((t) => score <= t.max) || RISK_CALC_TIERS[RISK_CALC_TIERS.length - 1];
        renderResult(score, tier, positives, negatives);
      });
    }

    if (retakeBtn) {
      retakeBtn.addEventListener("click", () => {
        Object.keys(answers).forEach((k) => delete answers[k]);
        allButtonGroups.forEach((buttons) => buttons.forEach((b) => b.classList.remove("is-selected")));
        updateProgress();
        if (resultWrap) resultWrap.hidden = true;
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  /* ============================================================
     ASKCOMMON — site-wide floating chat widget. Talks only to
     this site's own /api/ask endpoint (same-origin), which is
     the only place an LLM API key ever lives. See
     ASKCOMMON-SETUP.md for how to turn it on.
     ============================================================ */
  function initAskCommon() {
    if (document.getElementById("askc")) return;

    const wrap = document.createElement("div");
    wrap.className = "askc no-print";
    wrap.id = "askc";
    wrap.innerHTML =
      '<button class="askc__toggle" id="askcToggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="askcPanel">' +
        '<span class="askc__toggle-icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4h-1A2.5 2.5 0 0 1 2 13.5v-8A2.5 2.5 0 0 1 4.5 3" /><circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor" stroke="none"/></svg>' +
        '</span>' +
        '<span class="askc__toggle-label">AskCommon</span>' +
      '</button>' +
      '<div class="askc__panel" id="askcPanel" role="dialog" aria-label="AskCommon chat" hidden>' +
        '<div class="askc__head">' +
          '<span class="askc__head-icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4h-1A2.5 2.5 0 0 1 2 13.5v-8A2.5 2.5 0 0 1 4.5 3" /><circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor" stroke="none"/></svg>' +
          '</span>' +
          '<div class="askc__head-text">' +
            '<p class="askc__head-title">AskCommon</p>' +
            '<p class="askc__head-sub">Ask about cancer basics, risk, or treatment</p>' +
          '</div>' +
          '<button type="button" class="askc__close" id="askcClose" aria-label="Close chat">&times;</button>' +
        '</div>' +
        '<p class="askc__disclaimer">Educational only, not medical advice. For anything about your own health, talk to a parent/guardian, school nurse, or doctor.</p>' +
        '<div class="askc__messages" id="askcMessages" aria-live="polite"></div>' +
        '<form class="askc__form" id="askcForm">' +
          '<input type="text" id="askcInput" maxlength="' + 500 + '" autocomplete="off" placeholder="Ask a question…" aria-label="Your question" />' +
          '<button type="submit" class="askc__send" id="askcSend" aria-label="Send">' +
            '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12l16-7-6 7 6 7z" fill="currentColor" stroke="none"/></svg>' +
          '</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(wrap);

    const toggleBtn = document.getElementById("askcToggle");
    const closeBtn = document.getElementById("askcClose");
    const panel = document.getElementById("askcPanel");
    const messagesEl = document.getElementById("askcMessages");
    const form = document.getElementById("askcForm");
    const input = document.getElementById("askcInput");
    const sendBtn = document.getElementById("askcSend");

    const history = [];
    let greeted = false;
    let pending = false;

    function addMessage(role, text) {
      const row = document.createElement("div");
      row.className = "askc__msg askc__msg--" + role;
      row.textContent = text;
      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return row;
    }

    function openPanel() {
      panel.hidden = false;
      toggleBtn.setAttribute("aria-expanded", "true");
      wrap.classList.add("is-open");
      if (!greeted) {
        greeted = true;
        addMessage("bot", "Hi, I'm AskCommon! Ask me anything about cancer biology, risk factors, screening, or treatment — or how this course works.");
      }
      input.focus();
    }
    function closePanel() {
      panel.hidden = true;
      toggleBtn.setAttribute("aria-expanded", "false");
      wrap.classList.remove("is-open");
    }

    toggleBtn.addEventListener("click", () => {
      if (panel.hidden) openPanel(); else closePanel();
    });
    closeBtn.addEventListener("click", closePanel);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) closePanel();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (pending) return;
      const text = input.value.trim();
      if (!text) return;

      addMessage("user", text);
      history.push({ role: "user", text });
      input.value = "";
      pending = true;
      sendBtn.disabled = true;
      const typingRow = addMessage("bot", "…");
      typingRow.classList.add("askc__msg--typing");

      fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          page: document.body.dataset.page || "",
          history: history.slice(-6),
        }),
      })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          typingRow.remove();
          const reply = ok
            ? data.reply
            : (data && data.message) || "Something went wrong — please try again.";
          addMessage("bot", reply);
          history.push({ role: "assistant", text: reply });
        })
        .catch(() => {
          typingRow.remove();
          addMessage("bot", "AskCommon couldn't be reached — check your connection and try again.");
        })
        .finally(() => {
          pending = false;
          sendBtn.disabled = false;
        });
    });
  }

  return {
    initModule, initAccordions, initChoiceActivities, initReveals,
    initReflections, initQuizzes, initHomeCards, initCertificatePage,
    initLogin, initCardPickers, initSortChips, initDragSequences, initDragSorts,
    getModuleProgress, setModuleProgress, initTilt3D,
    isModuleUnlocked, renderModuleLock, prerequisiteFor, MODULE_LABELS,
    initRiskCalculator, initAskCommon,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  CIC.initLogin();
  CIC.initAskCommon();
  const page = document.body.dataset.page;
  if (page === "home") {
    CIC.initHomeCards();
    CIC.initTilt3D(".module-card:not(.module-card--locked)", { maxTilt: 9 });
  } else if (page === "module1" || page === "module2" || page === "module3") {
    if (!CIC.isModuleUnlocked(page)) {
      CIC.renderModuleLock(page);
    } else {
      CIC.initModule(page);
      CIC.initAccordions();
      CIC.initChoiceActivities();
      CIC.initReveals();
      CIC.initReflections();
      CIC.initQuizzes(page);
      CIC.initCardPickers();
      CIC.initSortChips();
      CIC.initDragSequences();
      CIC.initDragSorts();
      CIC.initTilt3D(".diagram-box", { maxTilt: 7, target: "svg" });
      CIC.initTilt3D(".cell-figure figure", { maxTilt: 7 });
    }
  } else if (page === "certificate") {
    CIC.initCertificatePage();
  } else if (page === "risk-calculator") {
    CIC.initReveals();
    CIC.initRiskCalculator();
  }
});
