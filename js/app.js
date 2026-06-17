/* =====================================================================
   Grandmother's Health Almanac — app logic
   Dependency-free. All data lives in localStorage on this device.

   Data model
   ----------
   food[]       : { id, item, portion, when, notes, reactions[], createdAt }
   reaction     : { id, note, severity (none|mild|moderate|severe), when }
   medication[] : { id, name, dose, when, taken, notes, createdAt }
   ===================================================================== */
(function () {
  "use strict";

  const PREFIX = "gma:";
  const TYPES = ["food", "medication"];
  const data = { food: [], medication: [] };

  /* ---- premade, selectable items (Grandma is Jewish–Slavic) ---- */
  const FOOD_SUGGESTIONS = [
    "Matzo ball soup", "Borscht", "Gefilte fish", "Latkes", "Challah",
    "Blintzes", "Kreplach", "Kasha varnishkes", "Noodle kugel", "Rugelach",
    "Brisket", "Tzimmes", "Cholent", "Holishkes (stuffed cabbage)", "Pierogi",
    "Varenyky", "Holodets", "Herring in oil", "Pickled herring", "Black rye bread",
    "Chocolate babka", "Kompot", "Tea with lemon", "Schav (sorrel soup)",
    "Mamaliga", "Halva", "Borscht with smetana", "Cottage cheese & sour cream",
  ];
  const FOOD_CHIPS = [
    "Matzo ball soup", "Borscht", "Gefilte fish", "Latkes", "Challah",
    "Blintzes", "Noodle kugel", "Herring", "Pierogi", "Rugelach",
    "Brisket", "Tzimmes",
  ];
  const MED_SUGGESTIONS = [
    "Lisinopril", "Amlodipine", "Metformin", "Atorvastatin", "Levothyroxine",
    "Aspirin (low-dose)", "Vitamin D", "Vitamin B12", "Omeprazole", "Bisoprolol",
    "Warfarin", "Furosemide", "Calcium + D", "Paracetamol",
  ];
  const MED_CHIPS = ["Lisinopril", "Metformin", "Atorvastatin", "Levothyroxine", "Vitamin D", "Aspirin"];

  /* ------------------------ cat sounds ------------------------- */
  const SOUNDS = {
    meow:  { label: "Meow!",  glyph: "\u{12166}\u{1214E}", anim: "is-active" },
    purr:  { label: "Prrrr…", glyph: "\u{121AA}\u{1219B}", anim: "is-active" },
    chirp: { label: "Brrt!",  glyph: "\u{12000}\u{12022}", anim: "is-active" },
    hiss:  { label: "Hsssss!", glyph: "\u{12100}\u{1208D}", anim: "is-active--hiss" },
  };
  const SEV_RANK = { none: 0, mild: 1, moderate: 2, severe: 3 };
  const SEV_LABEL = { none: "No issue", mild: "Mild", moderate: "Moderate", severe: "Severe", taken: "Taken", missed: "Not taken" };

  /* -------------------------- storage -------------------------- */
  function load() {
    TYPES.forEach(function (type) {
      try {
        const raw = localStorage.getItem(PREFIX + type);
        data[type] = raw ? JSON.parse(raw) : [];
      } catch (e) { data[type] = []; }
    });
    // be tolerant of older records that predate linked reactions
    data.food.forEach(function (m) { if (!Array.isArray(m.reactions)) m.reactions = []; });
  }
  function save(type) {
    try { localStorage.setItem(PREFIX + type, JSON.stringify(data[type])); } catch (e) {}
  }

  /* --------------------------- helpers ------------------------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function nowLocalInput() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function fmtWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const date = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return date + " · " + time;
  }

  function isToday(iso) {
    const d = new Date(iso), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function setText(id, val) { const n = document.getElementById(id); if (n) n.textContent = val; }
  function badge(kind, label) { return el("span", "badge badge--" + kind, label || SEV_LABEL[kind] || kind); }
  function delButton(onClick, cls) {
    const b = el("button", cls || "entry__del", "×");
    b.type = "button"; b.title = "Remove"; b.setAttribute("aria-label", "Remove");
    b.addEventListener("click", onClick);
    return b;
  }

  /* ----------------------- meal rendering ---------------------- */
  function buildMealNode(e) {
    const li = el("li", "meal"); li.dataset.id = e.id;

    const head = el("div", "meal__head");
    const main = el("div", "entry__main");
    main.appendChild(el("div", "entry__title", e.item || "Meal"));
    const bits = [];
    if (e.portion) bits.push(e.portion);
    if (e.notes) bits.push(e.notes);
    if (bits.length) main.appendChild(el("div", "entry__meta", bits.join(" — ")));
    main.appendChild(el("span", "entry__time", fmtWhen(e.when)));
    head.appendChild(main);
    head.appendChild(delButton(function () { removeEntry("food", e.id); }));
    li.appendChild(head);

    const rwrap = el("div", "meal__reactions");
    const reactions = (e.reactions || []).slice().sort(function (a, b) { return new Date(b.when) - new Date(a.when); });
    if (reactions.length) {
      const ul = el("ul", "reactions");
      reactions.forEach(function (r) { ul.appendChild(buildReactionNode(e.id, r)); });
      rwrap.appendChild(ul);
    } else {
      rwrap.appendChild(el("p", "reaction-empty", "No reactions logged for this meal."));
    }

    const addBtn = el("button", "reaction-add", "＋ Log a reaction");
    addBtn.type = "button";
    const form = buildReactionForm(e.id);
    addBtn.addEventListener("click", function () {
      form.hidden = !form.hidden;
      if (!form.hidden) { const first = form.querySelector("input, select"); if (first) first.focus(); }
    });
    rwrap.appendChild(addBtn);
    rwrap.appendChild(form);
    li.appendChild(rwrap);
    return li;
  }

  function buildReactionNode(mealId, r) {
    const li = el("li", "reaction");
    const main = el("div", "reaction__main");
    const sev = (r.severity || "mild").toLowerCase();
    const text = el("span", "reaction__text", r.note || "Reaction");
    text.appendChild(badge(sev));
    main.appendChild(text);
    main.appendChild(el("span", "reaction__time", fmtWhen(r.when)));
    li.appendChild(main);
    li.appendChild(delButton(function () { removeReaction(mealId, r.id); }, "reaction__del"));
    return li;
  }

  function makeField(labelText, control, wide) {
    const f = el("div", "field" + (wide ? " field--wide" : ""));
    control.id = control.id || ("rf-" + uid());
    const lab = el("label", null, labelText); lab.setAttribute("for", control.id);
    f.appendChild(lab); f.appendChild(control);
    return f;
  }

  function buildReactionForm(mealId) {
    const form = el("form", "reaction-form");
    form.hidden = true; form.setAttribute("autocomplete", "off");

    const note = document.createElement("input");
    note.type = "text"; note.name = "note"; note.required = true;
    note.placeholder = "Bloating, itchy lips, felt great…";

    const sel = document.createElement("select"); sel.name = "severity";
    [["mild", "Mild"], ["moderate", "Moderate"], ["severe", "Severe"], ["none", "No issue"]]
      .forEach(function (o) { const opt = document.createElement("option"); opt.value = o[0]; opt.textContent = o[1]; sel.appendChild(opt); });

    const when = document.createElement("input");
    when.type = "datetime-local"; when.name = "when"; when.value = nowLocalInput();

    form.appendChild(makeField("Reaction or symptom", note, true));
    form.appendChild(makeField("Severity", sel, false));
    form.appendChild(makeField("When", when, false));

    const actions = el("div", "form-actions");
    const saveBtn = el("button", "btn-save", "Save reaction"); saveBtn.type = "submit";
    const cancelBtn = el("button", "btn-cancel", "Cancel"); cancelBtn.type = "button";
    cancelBtn.addEventListener("click", function () { form.hidden = true; });
    actions.appendChild(saveBtn); actions.appendChild(cancelBtn);
    form.appendChild(actions);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      addReaction(mealId, {
        id: uid(),
        note: note.value.trim(),
        severity: sel.value || "mild",
        when: when.value || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    });
    return form;
  }

  /* --------------------- medication rendering ------------------ */
  function buildMedNode(e) {
    const li = el("li", "entry"); li.dataset.id = e.id;
    const main = el("div", "entry__main");
    const title = el("div", "entry__title", e.name || "Medication");
    if (e.dose) title.appendChild(el("span", "sub", "  · " + e.dose));
    title.appendChild(e.taken ? badge("taken") : badge("missed"));
    main.appendChild(title);
    if (e.notes) main.appendChild(el("div", "entry__meta", e.notes));
    main.appendChild(el("span", "entry__time", fmtWhen(e.when)));
    li.appendChild(main);
    li.appendChild(delButton(function () { removeEntry("medication", e.id); }));
    return li;
  }

  /* ---------------------------- render ------------------------- */
  function render(type) { type === "food" ? renderFood() : renderMeds(); }
  function renderAll() { renderFood(); renderMeds(); }

  function renderFood() {
    const list = document.querySelector('[data-list="food"]'); if (!list) return;
    list.textContent = "";
    const items = data.food.slice().sort(function (a, b) { return new Date(b.when) - new Date(a.when); });
    if (!items.length) { list.appendChild(el("li", "empty", "No meals recorded yet. Add Grandma’s first today.")); return; }
    items.forEach(function (e) { list.appendChild(buildMealNode(e)); });
  }

  function renderMeds() {
    const list = document.querySelector('[data-list="medication"]'); if (!list) return;
    list.textContent = "";
    const items = data.medication.slice().sort(function (a, b) { return new Date(b.when) - new Date(a.when); });
    if (!items.length) { list.appendChild(el("li", "empty", "No doses recorded yet.")); return; }
    items.forEach(function (e) { list.appendChild(buildMedNode(e)); });
  }

  /* ------------------------- mutations ------------------------- */
  function addEntry(type, obj) {
    obj.id = uid();
    obj.createdAt = new Date().toISOString();
    if (type === "food" && !Array.isArray(obj.reactions)) obj.reactions = [];
    data[type].push(obj);
    save(type); render(type); updateReport();
  }
  function removeEntry(type, id) {
    data[type] = data[type].filter(function (e) { return e.id !== id; });
    save(type); render(type); updateReport();
  }
  function addReaction(mealId, r) {
    const meal = data.food.find(function (m) { return m.id === mealId; });
    if (!meal) return;
    if (!Array.isArray(meal.reactions)) meal.reactions = [];
    meal.reactions.push(r);
    save("food"); renderFood(); updateReport();
  }
  function removeReaction(mealId, rId) {
    const meal = data.food.find(function (m) { return m.id === mealId; });
    if (!meal || !meal.reactions) return;
    meal.reactions = meal.reactions.filter(function (r) { return r.id !== rId; });
    save("food"); renderFood(); updateReport();
  }

  /* ------------------- dashboard summary report ---------------- */
  function updateReport() {
    const meals = data.food;
    setText("stat-meals", meals.filter(function (m) { return isToday(m.when); }).length);
    setText("stat-meals-total", meals.length);

    const allReactions = [];
    meals.forEach(function (m) { (m.reactions || []).forEach(function (r) { allReactions.push(r); }); });
    const adverse = allReactions.filter(function (r) { return r.severity && r.severity !== "none"; });
    setText("stat-reactions", adverse.filter(function (r) { return isToday(r.when); }).length);
    setText("stat-reactions-total", adverse.length);

    // severity breakdown (all-time)
    const counts = { none: 0, mild: 0, moderate: 0, severe: 0 };
    allReactions.forEach(function (r) { const s = r.severity || "mild"; if (counts[s] != null) counts[s]++; });
    const max = Math.max(1, counts.none, counts.mild, counts.moderate, counts.severe);
    ["none", "mild", "moderate", "severe"].forEach(function (s) {
      setText("n-" + s, counts[s]);
      const bar = document.getElementById("bar-" + s);
      if (bar) bar.style.width = (counts[s] / max * 100) + "%";
    });

    // medication adherence (today)
    const medsToday = data.medication.filter(function (m) { return isToday(m.when); });
    const taken = medsToday.filter(function (m) { return m.taken; }).length;
    const missed = medsToday.length - taken;
    setText("stat-doses", taken);
    setText("stat-missed", missed);

    const at = document.getElementById("adherence-text");
    const asub = document.getElementById("adherence-sub");
    const abar = document.getElementById("bar-adherence");
    if (!medsToday.length) {
      if (at) at.textContent = "No doses scheduled today.";
      if (asub) asub.textContent = "";
      if (abar) abar.style.width = "0%";
    } else {
      const pct = Math.round(taken / medsToday.length * 100);
      if (at) at.textContent = "Taken " + taken + " of " + medsToday.length + " (" + pct + "%)";
      if (asub) asub.textContent = missed > 0
        ? (missed + " dose" + (missed === 1 ? "" : "s") + " still due today.")
        : "All doses taken — wonderful.";
      if (abar) abar.style.width = pct + "%";
    }

    // foods linked to (adverse) reactions, aggregated by dish
    const ul = document.getElementById("report-foods");
    if (ul) {
      ul.textContent = "";
      const agg = {};
      meals.forEach(function (m) {
        const adv = (m.reactions || []).filter(function (r) { return r.severity && r.severity !== "none"; });
        if (!adv.length) return;
        const name = m.item || "Meal";
        const key = name.toLowerCase();
        if (!agg[key]) agg[key] = { name: name, count: 0, worst: "mild" };
        agg[key].count += adv.length;
        adv.forEach(function (r) { if (SEV_RANK[r.severity] > SEV_RANK[agg[key].worst]) agg[key].worst = r.severity; });
      });
      const rows = Object.keys(agg).map(function (k) { return agg[k]; })
        .sort(function (a, b) { return SEV_RANK[b.worst] - SEV_RANK[a.worst] || b.count - a.count; });
      if (!rows.length) {
        ul.appendChild(el("li", "reaction-empty", "No foods have been linked to a reaction yet."));
      } else {
        rows.forEach(function (r) {
          const li = el("li");
          li.appendChild(el("span", "food-name", r.name));
          li.appendChild(badge(r.worst));
          li.appendChild(el("span", "food-count", r.count + " reaction" + (r.count === 1 ? "" : "s")));
          ul.appendChild(li);
        });
      }
    }
  }

  /* ----------------------- form wiring ------------------------- */
  function wireForms() {
    document.querySelectorAll(".entry-form[data-form]").forEach(function (form) {
      const type = form.dataset.form;
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        const fd = new FormData(form);
        const obj = {};
        fd.forEach(function (v, k) { obj[k] = typeof v === "string" ? v.trim() : v; });
        if (type === "medication") obj.taken = fd.has("taken");
        if (type === "food") obj.reactions = [];
        if (!obj.when) obj.when = new Date().toISOString();
        addEntry(type, obj);
        form.reset();
        resetWhenField(form);
      });
    });
  }
  function resetWhenField(form) {
    const when = form.querySelector('input[name="when"]'); if (when) when.value = nowLocalInput();
    const taken = form.querySelector('input[name="taken"]'); if (taken) taken.checked = true;
  }
  function primeDefaults() { document.querySelectorAll(".entry-form[data-form]").forEach(resetWhenField); }

  /* ---------------- premade chips + datalists ------------------ */
  function buildChips(hostId, items, targetInputId) {
    const host = document.getElementById(hostId); if (!host) return;
    items.forEach(function (name) {
      const b = el("button", "chip", name); b.type = "button";
      b.addEventListener("click", function () {
        const inp = document.getElementById(targetInputId);
        if (inp) { inp.value = name; inp.focus(); }
      });
      host.appendChild(b);
    });
  }
  function buildDatalist(id, items) {
    const dl = document.getElementById(id); if (!dl) return;
    items.forEach(function (v) { const o = document.createElement("option"); o.value = v; dl.appendChild(o); });
  }
  function primeData() {
    buildChips("food-chips", FOOD_CHIPS, "food-item");
    buildChips("med-chips", MED_CHIPS, "med-name");
    buildDatalist("food-suggestions", FOOD_SUGGESTIONS);
    buildDatalist("med-suggestions", MED_SUGGESTIONS);
  }

  /* --------------------------- theme --------------------------- */
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(PREFIX + "theme", theme); } catch (e) {}
    document.querySelectorAll("[data-set-theme]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.setTheme === theme);
    });
  }
  function wireTheme() {
    document.querySelectorAll("[data-set-theme]").forEach(function (btn) {
      btn.addEventListener("click", function () { setTheme(btn.dataset.setTheme); });
    });
    let saved = "cyberpunk";
    try { saved = localStorage.getItem(PREFIX + "theme") || "cyberpunk"; } catch (e) {}
    setTheme(saved);
  }

  /* ----------------------- cat sounds (Web Audio) -------------- */
  let audioCtx = null;
  function getCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function meow(c) {
    const t0 = c.currentTime, T = 0.72;
    const src = c.createOscillator(); src.type = "sawtooth";
    src.frequency.setValueAtTime(430, t0);
    src.frequency.linearRampToValueAtTime(700, t0 + 0.16);
    src.frequency.linearRampToValueAtTime(560, t0 + 0.46);
    src.frequency.linearRampToValueAtTime(420, t0 + T);
    const lfo = c.createOscillator(); lfo.frequency.value = 17;
    const lfoGain = c.createGain(); lfoGain.gain.value = 13;
    lfo.connect(lfoGain).connect(src.frequency);
    const f1 = c.createBiquadFilter(); f1.type = "bandpass"; f1.Q.value = 7;
    f1.frequency.setValueAtTime(900, t0); f1.frequency.linearRampToValueAtTime(650, t0 + T);
    const f2 = c.createBiquadFilter(); f2.type = "bandpass"; f2.Q.value = 10;
    f2.frequency.setValueAtTime(2300, t0); f2.frequency.linearRampToValueAtTime(1050, t0 + T);
    const g1 = c.createGain(); g1.gain.value = 0.85;
    const g2 = c.createGain(); g2.gain.value = 0.5;
    const body = c.createGain(); body.gain.value = 0.18;
    const amp = c.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(0.9, t0 + 0.05);
    amp.gain.setValueAtTime(0.85, t0 + 0.4);
    amp.gain.exponentialRampToValueAtTime(0.0008, t0 + T);
    src.connect(f1).connect(g1).connect(amp);
    src.connect(f2).connect(g2).connect(amp);
    src.connect(body).connect(amp);
    amp.connect(c.destination);
    src.start(t0); lfo.start(t0); src.stop(t0 + T + 0.05); lfo.stop(t0 + T + 0.05);
  }

  function purr(c) {
    const t0 = c.currentTime, T = 1.5;
    const osc = c.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 45;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 210; lp.Q.value = 3;
    const trem = c.createOscillator(); trem.type = "sine"; trem.frequency.value = 26;
    const tremGain = c.createGain(); tremGain.gain.value = 0.45;
    const amp = c.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(0.5, t0 + 0.3);
    amp.gain.setValueAtTime(0.5, t0 + T - 0.35);
    amp.gain.exponentialRampToValueAtTime(0.0008, t0 + T);
    trem.connect(tremGain).connect(amp.gain);   // amplitude wobble = the purr
    osc.connect(lp).connect(amp).connect(c.destination);
    osc.start(t0); trem.start(t0); osc.stop(t0 + T + 0.05); trem.stop(t0 + T + 0.05);
  }

  function chirp(c) {
    const t0 = c.currentTime, T = 0.46;
    const osc = c.createOscillator(); osc.type = "triangle";
    osc.frequency.setValueAtTime(720, t0);
    osc.frequency.linearRampToValueAtTime(1500, t0 + 0.12);
    osc.frequency.linearRampToValueAtTime(1120, t0 + 0.2);
    osc.frequency.linearRampToValueAtTime(1620, t0 + 0.32);
    osc.frequency.linearRampToValueAtTime(1200, t0 + T);
    const vib = c.createOscillator(); vib.frequency.value = 35;
    const vibG = c.createGain(); vibG.gain.value = 60;
    vib.connect(vibG).connect(osc.frequency);
    const amp = c.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    [0.0, 0.13, 0.26].forEach(function (o) {
      amp.gain.linearRampToValueAtTime(0.55, t0 + o + 0.02);
      amp.gain.linearRampToValueAtTime(0.06, t0 + o + 0.11);
    });
    amp.gain.exponentialRampToValueAtTime(0.0006, t0 + T);
    osc.connect(amp).connect(c.destination);
    osc.start(t0); vib.start(t0); osc.stop(t0 + T + 0.05); vib.stop(t0 + T + 0.05);
  }

  function hiss(c) {
    const t0 = c.currentTime, T = 0.6;
    const n = Math.floor(c.sampleRate * T);
    const buffer = c.createBuffer(1, n, c.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buffer;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2600;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 5200; bp.Q.value = 0.8;
    const amp = c.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(0.5, t0 + 0.05);
    amp.gain.exponentialRampToValueAtTime(0.0006, t0 + T);
    src.connect(hp).connect(bp).connect(amp).connect(c.destination);
    src.start(t0); src.stop(t0 + T);
  }

  function playSound(type) {
    const c = getCtx(); if (!c) return;
    try {
      if (type === "purr") purr(c);
      else if (type === "chirp") chirp(c);
      else if (type === "hiss") hiss(c);
      else meow(c);
    } catch (e) { /* audio unavailable — visuals still play */ }
  }

  let bubbleTimer = null;
  function showBubble(type) {
    const bubble = document.getElementById("meowBubble"); if (!bubble) return;
    const s = SOUNDS[type] || SOUNDS.meow;
    const sumerian = document.documentElement.dataset.theme === "sumerian";
    bubble.textContent = sumerian ? s.glyph : s.label;
    bubble.classList.toggle("is-glyph", sumerian);
    bubble.classList.add("is-shown");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove("is-shown"); }, 1300);
  }
  function animateCat(animClass) {
    const cat = document.getElementById("cat"); if (!cat) return;
    cat.classList.remove("is-active", "is-active--hiss");
    void cat.offsetWidth;
    cat.classList.add(animClass);
    cat.addEventListener("animationend", function handler() {
      cat.classList.remove("is-active", "is-active--hiss");
      cat.removeEventListener("animationend", handler);
    });
  }
  function wireSounds() {
    document.querySelectorAll(".sound-btn[data-sound]").forEach(function (btn) {
      const type = btn.dataset.sound;
      btn.addEventListener("click", function () {
        playSound(type);
        animateCat((SOUNDS[type] || SOUNDS.meow).anim);
        showBubble(type);
      });
    });
  }

  /* --------------------- ambient petals/shards ----------------- */
  function spawnPetals() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = document.getElementById("petals"); if (!host) return;
    for (let i = 0; i < 14; i++) {
      const p = el("span", "petal");
      const size = 8 + Math.random() * 12;
      p.style.left = Math.random() * 100 + "vw";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.animationDuration = 9 + Math.random() * 12 + "s";
      p.style.animationDelay = -Math.random() * 16 + "s";
      host.appendChild(p);
    }
  }

  /* ---------------------------- init --------------------------- */
  function init() {
    load();
    wireTheme();
    primeData();
    wireForms();
    wireSounds();
    primeDefaults();
    renderAll();
    updateReport();
    spawnPetals();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
