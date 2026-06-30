(function () {
  const oldFinder = window.findScholarships;

  window.findScholarships = function () {
    const live = Array.isArray(window.applymateLiveFinderData) ? window.applymateLiveFinderData : [];
    if (!live.length || typeof window.renderResults !== "function") {
      if (typeof oldFinder === "function") oldFinder();
      return;
    }

    const state = value("state", "any");
    const education = value("education", "school");
    const category = value("category", "general");
    const income = Number(value("income", "100000"));
    const search = value("search", "").trim().toLowerCase();

    const matches = live
      .map((raw) => normalize(raw))
      .map((item) => score(item, { state, education, category, income, search }))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    window.renderResults(matches);
  };

  function score(item, profile) {
    const edu = arr(item.education);
    const cats = arr(item.categories);
    const maxIncome = Number(item.maxIncome || 99999999) || 99999999;
    const stateOk = profile.state === "any" || item.state === profile.state || item.state === "national";
    const eduOk = edu.includes(profile.education) || edu.includes("any");
    const catOk = cats.includes(profile.category) || cats.includes("general") || synonym(profile.category).some((x) => cats.includes(x));
    const incomeOk = profile.income <= maxIncome || maxIncome >= 99999999;
    if (!stateOk || !eduOk || !catOk || !incomeOk) return null;

    let points = Number(item.priority || 50);
    if (item.state === profile.state) points += 25;
    if (edu.includes(profile.education)) points += 20;
    if (cats.includes(profile.category)) points += 20;

    if (profile.search) {
      const text = clean([item.name, item.stateLabel, item.sourceName, item.eligibilityNote, item.incomeNote, item.amount, edu.join(" "), cats.join(" ")].join(" "));
      if (!text.includes(profile.search)) return null;
      points += 20;
    }

    return { ...item, score: points };
  }

  function normalize(item) {
    const cats = arr(item.categories);
    if (clean(item.gender) === "female" && !cats.includes("girls")) cats.push("girls");
    if (item.disability === "yes" && !cats.includes("disabled")) cats.push("disabled");
    return {
      ...item,
      state: item.state || "national",
      stateLabel: item.stateLabel || labelState(item.state || "national"),
      education: arr(item.education).length ? arr(item.education) : ["degree"],
      categories: cats.length ? cats : ["general"],
      maxIncome: Number(item.maxIncome || 99999999) || 99999999,
      deadline: item.deadline || "Check official portal",
      link: item.link || "scholarship-hub.html",
      sourceName: item.sourceName || "Official source",
      eligibilityNote: item.eligibilityNote || "Verify eligibility on official portal.",
      incomeNote: item.incomeNote || "Verify income rules on official portal.",
      documents: docs(item.documents)
    };
  }

  function value(id, fallback) { return document.getElementById(id)?.value || fallback; }
  function arr(v) { return Array.isArray(v) ? v.map(clean).filter(Boolean) : String(v || "").split(",").map(clean).filter(Boolean); }
  function docs(v) { const d = Array.isArray(v) ? v.filter(Boolean) : String(v || "").split(",").map((x) => x.trim()).filter(Boolean); return d.length ? d : ["Aadhaar card", "Income certificate if applicable", "Category certificate if applicable", "Previous marks memo", "Bank details"]; }
  function clean(v) { return String(v || "").trim().toLowerCase(); }
  function synonym(c) { return { bc: ["obc", "ebc"], obc: ["bc", "ebc"], ebc: ["ews", "obc", "bc"], ews: ["ebc"], girls: ["female"], disabled: ["disability"] }[c] || []; }
  function labelState(s) { return s === "andhra-pradesh" ? "Andhra Pradesh" : s === "telangana" ? "Telangana" : "National"; }
})();
