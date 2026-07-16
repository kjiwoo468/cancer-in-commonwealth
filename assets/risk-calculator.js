/* ============================================================
   Cancer in the Commonwealth — Appalachian Kentucky Cancer Risk
   Index (ACKRI) calculator
   ============================================================
   Implements the relative-risk methodology described in
   "A Regionally Calibrated Approach to Cancer Risk Estimation
   for Appalachian Kentucky." Every relative-risk (RR) value below
   is either taken directly from a cited meta-analysis / cohort
   study, or is a clearly-flagged (approx: true) interpolation
   between cited values where the literature only gives an
   endpoint (e.g., "current smoker" but not "quit 15 years ago").

   This produces an educational, relative estimate — "N times the
   Kentucky average" — NOT a validated absolute probability. See
   the "How this is calculated" accordion on the page, and the
   accompanying research paper, for full methodology and caveats.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     Regional prevalence inputs (Kentucky, statewide proxies —
     see paper Section 3 / Section 7 for why these are state-
     level rather than Appalachian-subregion-specific).
     ---------------------------------------------------------- */
  const PREVALENCE = {
    currentSmoking: 0.236, // KY adult current smoking rate
    obesity: 0.37,         // KY adult obesity rate (BMI >= 30)
    hpvVaccinated: 0.50,   // ~ half of KY youth vaccinated against HPV
  };

  /* ----------------------------------------------------------
     Relative risks, organized by cancer site. "approx" flags a
     reasoned interpolation rather than a single directly-cited
     point estimate; see the accordion on the page for sources.
     ---------------------------------------------------------- */
  const RR = {
    lung: {
      smoking: { never: 1, former_long: 2.0, former_recent: 8.0, current: 20 },
      smokingApprox: { never: false, former_long: true, former_recent: true, current: false },
      secondhand: { yes: 1.24, no: 1 },
      coalMining: { yes: 1.3, no: 1 },
      coalMiningApprox: true,
    },
    colorectal: {
      bmiPerFiveUnits: 1.10, // applied continuously: 1.10 ^ ((BMI-25)/5)
      activity: { sedentary: 1.3, moderate: 1.15, active: 1 },
      activityApprox: { sedentary: true, moderate: true, active: false },
      alcohol: { none: 1, light: 1.2, heavy: 1.44 },
      alcoholApprox: { none: false, light: true, heavy: false },
      meat: { rarely: 1, sometimes: 1.09, daily: 1.18 },
      meatApprox: { rarely: false, sometimes: true, daily: false },
      famHistory: { yes: 2.5, no: 1 },
      famHistoryApprox: true,
    },
    cervical: {
      bmiPerFiveUnits: 1.10,
      hpv: { none: 1, early: 0.15, later: 0.4 },
      hpvApprox: { none: false, early: false, later: true },
    },
    oralPharynx: {
      smoking: { never: 1, former_long: 1.61, former_recent: 1.61, current: 3.58 },
      alcohol: { none: 1, light: 1.8, heavy: 5.13 },
      alcoholApprox: { none: false, light: true, heavy: false },
    },
    laryngeal: {
      smoking: { never: 1, former_long: 1.88, former_recent: 3.62, current: 7.0 },
      alcohol: { none: 1, light: 1.4, heavy: 2.65 },
      alcoholApprox: { none: false, light: true, heavy: false },
    },
  };

  /* ----------------------------------------------------------
     Relative incidence weights for combining the five site-
     specific estimates into one "overall" composite. These are
     national SEER age-adjusted rates per 100,000 (both sexes,
     except cervical which is per 100,000 women and halved here
     to put it on a comparable total-population basis) — used
     purely as RELATIVE weights, not as Kentucky-specific
     absolute rates. Kentucky's true site mix skews even more
     toward lung cancer specifically than these national weights
     suggest (see the research paper); this is a documented
     simplification, not a precise regional calibration.
     Sources: SEER Cancer Stat Facts (Lung and Bronchus 47.2;
     Colon and Rectum 37.6; Oral Cavity and Pharynx 11.7;
     Larynx 2.5; Cervix Uteri 7.7 per 100,000 women).
     ---------------------------------------------------------- */
  const INCIDENCE_WEIGHT = {
    lung: 47.2,
    colorectal: 37.6,
    oralPharynx: 11.7,
    laryngeal: 2.5,
    cervical: 7.7 * 0.5,
  };

  // Incidence-weighted average of the site-specific multiples is
  // mathematically the correct way to combine them: if each site's
  // absolute risk is baseline_i * RR_i, the combined relative risk
  // across sites is sum(baseline_i * RR_i) / sum(baseline_i), which
  // is exactly a baseline-incidence-weighted average of the RR_i.
  // Weights are renormalized over only the sites actually shown to
  // this user (e.g., cervical dropped if not applicable).
  function computeOverall(results) {
    const keyBySite = { "Lung": "lung", "Colorectal": "colorectal", "Cervical": "cervical", "Oral cavity / pharynx": "oralPharynx", "Laryngeal": "laryngeal" };
    const totalWeight = results.reduce((sum, r) => sum + INCIDENCE_WEIGHT[keyBySite[r.site]], 0);
    const weighted = results.reduce((sum, r) => sum + INCIDENCE_WEIGHT[keyBySite[r.site]] * r.multiple, 0);
    return weighted / totalWeight;
  }

  function bmiMultiplier(bmi, perFive) {
    if (!bmi || !isFinite(bmi)) return 1;
    return Math.pow(perFive, (bmi - 25) / 5);
  }

  // Solves R0 = 1 / product(p_i * RR_i + (1 - p_i)) for the known-
  // prevalence factors only (see paper Section 5.2). Factors without
  // a reliable regional prevalence estimate are applied directly to
  // the individual estimate instead, without being divided out here —
  // an explicit, documented simplification (paper Section 7).
  function referenceRate(knownFactors) {
    const denom = knownFactors.reduce((acc, f) => acc * (f.p * f.rr + (1 - f.p)), 1);
    return 1 / denom;
  }

  function categorize(multiple) {
    if (multiple < 0.7) return { key: "low", label: "Well below the Kentucky average" };
    if (multiple < 1.3) return { key: "avg", label: "About the Kentucky average" };
    if (multiple < 2.5) return { key: "high", label: "Above the Kentucky average" };
    return { key: "vhigh", label: "Well above the Kentucky average" };
  }

  function meterWidth(multiple) {
    // Log-scaled so a 20x result doesn't just peg the bar at 100%
    // while still visually separating "about average" from "high."
    const pct = Math.min(100, Math.max(4, (Math.log(multiple + 0.05) - Math.log(0.15)) / (Math.log(25) - Math.log(0.15)) * 100));
    return pct.toFixed(0) + "%";
  }

  function fmtMultiple(m) {
    if (m >= 10) return Math.round(m) + "\u00d7";
    if (m >= 2) return m.toFixed(1) + "\u00d7";
    return m.toFixed(2) + "\u00d7";
  }

  function readForm(form) {
    const fd = new FormData(form);
    const heightFt = parseFloat(document.getElementById("calcHeightFt").value) || 0;
    const heightIn = parseFloat(document.getElementById("calcHeightIn").value) || 0;
    const weightLb = parseFloat(document.getElementById("calcWeightLb").value) || 0;
    const totalInches = heightFt * 12 + heightIn;
    const bmi = totalInches > 0 && weightLb > 0 ? (703 * weightLb) / (totalInches * totalInches) : null;

    return {
      age: parseFloat(document.getElementById("calcAge").value) || null,
      hasCervix: fd.get("hasCervix") || "no",
      smoking: fd.get("smoking") || "never",
      secondhand: fd.get("secondhand") || "no",
      bmi,
      alcohol: fd.get("alcohol") || "none",
      meat: fd.get("meat") || "rarely",
      activity: fd.get("activity") || "sedentary",
      famHistory: fd.get("famHistory") || "no",
      coalMining: fd.get("coalMining") || "no",
      hpv: fd.get("hpv") || "none",
      crcScreen: fd.get("crcScreen") || "na",
      cervScreen: fd.get("cervScreen") || "na",
      radon: fd.get("radon") || "never",
    };
  }

  function computeLung(inputs) {
    const r = RR.lung;
    const smokingIsCurrent = inputs.smoking === "current" ? 1 : 0;
    const R0 = referenceRate([{ p: PREVALENCE.currentSmoking, rr: r.smoking.current }]);
    const individual =
      R0 *
      r.smoking[inputs.smoking] *
      (inputs.smoking === "never" ? r.secondhand[inputs.secondhand] : 1) *
      r.coalMining[inputs.coalMining];

    const factors = [];
    if (inputs.smoking === "current") factors.push("Current smoking is by far the largest contributor here (~20\u00d7).");
    else if (inputs.smoking === "former_recent") factors.push("Quitting within the last 15 years still carries meaningfully elevated risk that continues to decline over time.");
    else if (inputs.smoking === "former_long") factors.push("Quitting more than 15 years ago has resolved most, but not all, of the excess risk.");
    if (inputs.smoking === "never" && inputs.secondhand === "yes") factors.push("Regular secondhand smoke exposure adds a modest amount of risk.");
    if (inputs.coalMining === "yes") factors.push("Underground coal-mining work carries a modest, independent increase in lung cancer risk, mainly from silica dust.");
    if (inputs.radon === "never") factors.push("Home radon status unknown \u2014 not factored into the number above, but worth testing regardless (see action below).");
    if (factors.length === 0) factors.push("No major elevated factors identified for lung cancer among the ones this tool asks about.");

    const actions = [];
    if (inputs.smoking === "current") actions.push('<a href="https://quitnowkentucky.org/" target="_blank" rel="noopener">Kentucky quitline & resources (quitnowkentucky.org)</a>');
    if (inputs.radon !== "low" && inputs.radon !== "mitigated") actions.push('<a href="https://www.epa.gov/radon" target="_blank" rel="noopener">Get a low-cost radon test kit (EPA)</a>');
    if (inputs.age && inputs.age >= 50 && (inputs.smoking === "current" || inputs.smoking === "former_recent" || inputs.smoking === "former_long")) {
      actions.push("Ask your doctor whether you qualify for annual low-dose CT lung cancer screening.");
    }

    return { site: "Lung", multiple: individual, factors, actions };
  }

  function computeColorectal(inputs) {
    const r = RR.colorectal;
    const bmiRR = bmiMultiplier(inputs.bmi, r.bmiPerFiveUnits);
    const obeseForR0 = inputs.bmi && inputs.bmi >= 30;
    const R0 = referenceRate([{ p: PREVALENCE.obesity, rr: bmiMultiplier(32.5, r.bmiPerFiveUnits) }]);
    const individual =
      R0 *
      (obeseForR0 ? bmiRR : bmiRR) * // continuous BMI effect applied either way
      r.activity[inputs.activity] *
      r.alcohol[inputs.alcohol] *
      r.meat[inputs.meat] *
      r.famHistory[inputs.famHistory];

    const factors = [];
    if (inputs.bmi && inputs.bmi >= 30) factors.push("Body-mass index above 30 is contributing meaningfully.");
    if (inputs.activity === "sedentary") factors.push("Low physical activity adds to colorectal cancer risk.");
    if (inputs.alcohol === "heavy") factors.push("Heavy alcohol use is a notable contributor.");
    if (inputs.meat === "daily") factors.push("Daily processed meat intake adds a modest amount of risk.");
    if (inputs.famHistory === "yes") factors.push("A first-degree family history roughly doubles baseline colorectal cancer risk on its own.");
    if (factors.length === 0) factors.push("No major elevated factors identified for colorectal cancer among the ones this tool asks about.");

    const actions = [];
    if (inputs.crcScreen === "no" || (inputs.age && inputs.age >= 45 && inputs.crcScreen === "na")) {
      actions.push("Schedule a colonoscopy or ask about an at-home FIT test \u2014 screening prevents colorectal cancer, not just catches it early.");
    }
    if (inputs.famHistory === "yes") actions.push("With a family history, ask your doctor whether you should start screening earlier than age 45.");

    return { site: "Colorectal", multiple: individual, factors, actions };
  }

  function computeCervical(inputs) {
    const r = RR.cervical;
    const bmiRR = bmiMultiplier(inputs.bmi, r.bmiPerFiveUnits);
    const R0 = referenceRate([{ p: PREVALENCE.hpvVaccinated, rr: r.hpv.early }]);
    const individual = R0 * bmiRR * r.hpv[inputs.hpv];

    const factors = [];
    if (inputs.hpv === "none") factors.push("Not being vaccinated against HPV is the largest modifiable factor for cervical cancer.");
    else if (inputs.hpv === "later") factors.push("Vaccination later in life (after possible HPV exposure) provides only partial protection.");
    if (inputs.bmi && inputs.bmi >= 30) factors.push("Higher body-mass index adds a small amount of additional risk.");
    if (factors.length === 0) factors.push("No major elevated factors identified for cervical cancer among the ones this tool asks about.");

    const actions = [];
    if (inputs.hpv === "none") actions.push('<a href="https://www.cancer.gov/about-cancer/causes-prevention/risk/infectious-agents/hpv-vaccine-fact-sheet" target="_blank" rel="noopener">Learn about HPV vaccination (NCI)</a> \u2014 it\u2019s recommended up to age 45, not just for children.');
    if (inputs.cervScreen === "no") actions.push("Schedule a Pap/HPV test \u2014 regular screening catches precancerous changes years before they become cancer.");

    return { site: "Cervical", multiple: individual, factors, actions };
  }

  function computeOralPharynx(inputs) {
    const r = RR.oralPharynx;
    const R0 = referenceRate([{ p: PREVALENCE.currentSmoking, rr: r.smoking.current }]);
    const individual = R0 * r.smoking[inputs.smoking] * r.alcohol[inputs.alcohol];

    const factors = [];
    if (inputs.smoking === "current") factors.push("Current smoking is the largest contributor here.");
    else if (inputs.smoking.startsWith("former")) factors.push("Former smoking still carries some residual elevated risk.");
    if (inputs.alcohol === "heavy") factors.push("Heavy alcohol use is a major contributor, and combines with smoking more than additively.");
    if (factors.length === 0) factors.push("No major elevated factors identified for oral/pharyngeal cancer among the ones this tool asks about.");

    const actions = [];
    if (inputs.smoking === "current" || inputs.alcohol === "heavy") actions.push("Ask your dentist or doctor about an oral cancer screening exam at your next visit.");

    return { site: "Oral cavity / pharynx", multiple: individual, factors, actions };
  }

  function computeLaryngeal(inputs) {
    const r = RR.laryngeal;
    const R0 = referenceRate([{ p: PREVALENCE.currentSmoking, rr: r.smoking.current }]);
    const individual = R0 * r.smoking[inputs.smoking] * r.alcohol[inputs.alcohol];

    const factors = [];
    if (inputs.smoking === "current") factors.push("Current smoking is the dominant driver of laryngeal cancer risk.");
    else if (inputs.smoking === "former_recent") factors.push("Risk stays meaningfully elevated for roughly 15 years after quitting.");
    if (inputs.alcohol === "heavy") factors.push("Heavy alcohol use adds risk on its own and combines with smoking.");
    if (factors.length === 0) factors.push("No major elevated factors identified for laryngeal cancer among the ones this tool asks about.");

    return { site: "Laryngeal", multiple: individual, factors, actions: [] };
  }

  function renderResults(inputs) {
    const resultsWrap = document.getElementById("calcResults");
    const cardsWrap = document.getElementById("riskCards");
    const overallWrap = document.getElementById("overallCard");
    const cervicalNote = document.getElementById("cervicalNote");
    cardsWrap.innerHTML = "";

    const results = [
      computeLung(inputs),
      computeColorectal(inputs),
      computeOralPharynx(inputs),
      computeLaryngeal(inputs),
    ];
    if (inputs.hasCervix === "yes") results.splice(2, 0, computeCervical(inputs));

    const overallMultiple = computeOverall(results);
    const overallCat = categorize(overallMultiple);
    const siteList = results.map((r) => r.site).join(", ");
    overallWrap.className = "overall-card overall-card--" + overallCat.key;
    overallWrap.innerHTML =
      '<p class="overall-card__label">Your overall estimate, across the ' + results.length + ' cancers below</p>' +
      '<p class="overall-card__multiple">' + fmtMultiple(overallMultiple) + '</p>' +
      '<span class="risk-card__category">' + overallCat.label + '</span>' +
      '<div class="risk-card__meter"><div class="risk-card__meter-fill" style="width:' + meterWidth(overallMultiple) + '"></div></div>' +
      '<p class="overall-card__note">This is a combined estimate across only the ' + results.length + ' cancers this tool models (' + siteList + '), weighted by how common each one is &mdash; ' +
      'it is <strong>not</strong> your risk of cancer overall. Dozens of other cancer types (breast, prostate, skin, kidney, and more) aren\u2019t included here.</p>';

    results.forEach((res) => {
      const cat = categorize(res.multiple);
      const card = document.createElement("div");
      card.className = "risk-card risk-card--" + cat.key;
      card.innerHTML =
        '<p class="risk-card__site">' + res.site + '</p>' +
        '<p class="risk-card__multiple">' + fmtMultiple(res.multiple) + '</p>' +
        '<span class="risk-card__category">' + cat.label + '</span>' +
        '<div class="risk-card__meter"><div class="risk-card__meter-fill" style="width:' + meterWidth(res.multiple) + '"></div></div>' +
        '<ul class="risk-card__factors">' + res.factors.map((f) => "<li>" + f + "</li>").join("") + '</ul>' +
        (res.actions.length ? '<ul class="risk-card__actions">' + res.actions.map((a) => "<li>" + a + "</li>").join("") + '</ul>' : "");
      cardsWrap.appendChild(card);
    });

    cervicalNote.textContent = inputs.hasCervix === "yes"
      ? ""
      : "Cervical cancer isn't shown because you indicated it doesn't apply to you. Change your answer above and recalculate if that's not right.";

    resultsWrap.hidden = false;
    resultsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateBmiReadout() {
    const ft = parseFloat(document.getElementById("calcHeightFt").value) || 0;
    const inch = parseFloat(document.getElementById("calcHeightIn").value) || 0;
    const lb = parseFloat(document.getElementById("calcWeightLb").value) || 0;
    const totalInches = ft * 12 + inch;
    const readout = document.getElementById("bmiReadout");
    if (totalInches > 0 && lb > 0) {
      const bmi = (703 * lb) / (totalInches * totalInches);
      readout.textContent = "BMI \u2248 " + bmi.toFixed(1);
    } else {
      readout.textContent = "Enter height & weight to calculate BMI";
    }
  }

  function updateConditionalSections() {
    const hasCervix = (document.querySelector('input[name="hasCervix"]:checked') || {}).value;
    document.getElementById("hpvSection").hidden = hasCervix !== "yes";
    document.getElementById("cervScreenField").hidden = hasCervix !== "yes";

    const smoking = (document.querySelector('input[name="smoking"]:checked') || {}).value;
    document.getElementById("secondhandField").hidden = smoking !== "never";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("riskCalcForm");
    if (!form) return; // not on this page

    ["calcHeightFt", "calcHeightIn", "calcWeightLb"].forEach((id) => {
      document.getElementById(id).addEventListener("input", updateBmiReadout);
    });
    form.addEventListener("change", updateConditionalSections);
    updateConditionalSections();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = readForm(form);
      renderResults(inputs);
    });

    document.getElementById("calcResetBtn").addEventListener("click", () => {
      form.reset();
      updateBmiReadout();
      updateConditionalSections();
      document.getElementById("calcResults").hidden = true;
    });
  });
})();
