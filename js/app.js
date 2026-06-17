/* =====================================================================
   Grandmother's Health Almanac — app logic
   Plain, dependency-free JS. All data lives in localStorage on this
   device; nothing is ever sent anywhere.
   ===================================================================== */
(function () {
  "use strict";

  const PREFIX = "gma:";
  const TYPES = ["food", "allergy", "medication"];

  /** in-memory mirror of stored data */
  const data = { food: [], allergy: [], medication: [] };

  /* -------------------------- storage -------------------------- */
  function load() {
    TYPES.forEach(function (type) {
      try {
        const raw = localStorage.getItem(PREFIX + type);
        data[type] = raw ? JSON.parse(raw) : [];
      } catch (e) {
        data[type] = [];
      }
    });
  }
  function save(type) {
    try {
      localStorage.setItem(PREFIX + type, JSON.stringify(data[type]));
    } catch (e) {
      /* storage may be unavailable (private mode); fail quietly */
    }
  }

  /* --------------------------- helpers ------------------------- */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** value for a datetime-local input representing "now" in local time */
  function nowLocalInput() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  /** human-friendly date/time for display */
  function fmtWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const date = d.toLocaleDateString(undefined, {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return date + " · " + time;
  }

  function isToday(iso) {
    const d = new Date(iso);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() &&
           d.getMonth() === n.getMonth() &&
           d.getDate() === n.getDate();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ----------------------- entry rendering --------------------- */
  function buildEntryNode(type, e) {
    const li = el("li", "entry");
    li.dataset.id = e.id;

    const main = el("div", "entry__main");
    const title = el("div", "entry__title");
    const meta = el("div", "entry__meta");

    if (type === "food") {
      title.textContent = e.item || "Meal";
      const bits = [];
      if (e.portion) bits.push(e.portion);
      if (e.notes) bits.push(e.notes);
      meta.textContent = bits.join(" — ");
    } else if (type === "allergy") {
      title.textContent = e.trigger || "Reaction";
      const sev = (e.severity || "mild").toLowerCase();
      const badge = el("span", "badge badge--" + sev, sev);
      title.appendChild(badge);
      const bits = [];
      if (e.reaction) bits.push(e.reaction);
      if (e.notes) bits.push(e.notes);
      meta.textContent = bits.join(" — ");
    } else { // medication
      title.textContent = e.name || "Medication";
      if (e.dose) {
        title.appendChild(el("span", null, "  · " + e.dose));
      }
      const badge = e.taken
        ? el("span", "badge badge--taken", "taken")
        : el("span", "badge badge--missed", "not taken");
      title.appendChild(badge);
      if (e.notes) meta.textContent = e.notes;
    }

    main.appendChild(title);
    if (meta.textContent) main.appendChild(meta);
    main.appendChild(el("span", "entry__time", fmtWhen(e.when)));

    const del = el("button", "entry__del", "×");
    del.type = "button";
    del.title = "Remove this entry";
    del.setAttribute("aria-label", "Remove entry");
    del.addEventListener("click", function () { removeEntry(type, e.id); });

    li.appendChild(main);
    li.appendChild(del);
    return li;
  }

  function render(type) {
    const list = document.querySelector('[data-list="' + type + '"]');
    if (!list) return;
    list.textContent = "";

    const items = data[type].slice().sort(function (a, b) {
      return new Date(b.when) - new Date(a.when);
    });

    if (!items.length) {
      const empty = el("li", "empty");
      empty.textContent = {
        food: "No meals recorded yet. Add Grandma’s first today.",
        allergy: "No reactions recorded — long may it stay that way.",
        medication: "No doses recorded yet.",
      }[type];
      list.appendChild(empty);
      return;
    }
    items.forEach(function (e) { list.appendChild(buildEntryNode(type, e)); });
  }

  function renderAll() { TYPES.forEach(render); }

  /* ------------------------- mutations ------------------------- */
  function addEntry(type, obj) {
    obj.id = uid();
    obj.createdAt = new Date().toISOString();
    data[type].push(obj);
    save(type);
    render(type);
    updateStats();
  }

  function removeEntry(type, id) {
    data[type] = data[type].filter(function (e) { return e.id !== id; });
    save(type);
    render(type);
    updateStats();
  }

  /* --------------------------- stats --------------------------- */
  function updateStats() {
    const meals = data.food.filter(function (e) { return isToday(e.when); }).length;
    const reactions = data.allergy.filter(function (e) { return isToday(e.when); }).length;
    const doses = data.medication.filter(function (e) { return isToday(e.when) && e.taken; }).length;
    setText("stat-meals", meals);
    setText("stat-reactions", reactions);
    setText("stat-meds", doses);
  }
  function setText(id, val) {
    const node = document.getElementById(id);
    if (node) node.textContent = val;
  }

  /* ----------------------- form wiring ------------------------- */
  function wireForms() {
    document.querySelectorAll(".entry-form").forEach(function (form) {
      const type = form.dataset.form;
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        const fd = new FormData(form);
        const obj = {};
        fd.forEach(function (value, key) {
          obj[key] = typeof value === "string" ? value.trim() : value;
        });
        if (type === "medication") obj.taken = fd.has("taken");
        if (!obj.when) obj.when = new Date().toISOString();
        addEntry(type, obj);
        form.reset();
        resetWhenField(form);
      });
    });
  }

  function resetWhenField(form) {
    const when = form.querySelector('input[name="when"]');
    if (when) when.value = nowLocalInput();
    const taken = form.querySelector('input[name="taken"]');
    if (taken) taken.checked = true;
  }

  function primeDefaults() {
    document.querySelectorAll(".entry-form").forEach(resetWhenField);
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
    let saved = "victorian";
    try { saved = localStorage.getItem(PREFIX + "theme") || "victorian"; } catch (e) {}
    setTheme(saved);
  }

  /* ---------------------- the meow (Web Audio) ------------------ */
  let audioCtx = null;
  function playMeow() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const ctx = audioCtx;
      const t0 = ctx.currentTime;
      const T = 0.72;

      // glottal source: a sawtooth that glides up then settles down
      const src = ctx.createOscillator();
      src.type = "sawtooth";
      src.frequency.setValueAtTime(430, t0);
      src.frequency.linearRampToValueAtTime(700, t0 + 0.16);
      src.frequency.linearRampToValueAtTime(560, t0 + 0.46);
      src.frequency.linearRampToValueAtTime(420, t0 + T);

      // a touch of vibrato gives it life
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 17;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 13;
      lfo.connect(lfoGain).connect(src.frequency);

      // two formant band-passes sweep from a bright "eee" to a round "ow"
      const f1 = ctx.createBiquadFilter();
      f1.type = "bandpass"; f1.Q.value = 7;
      f1.frequency.setValueAtTime(900, t0);
      f1.frequency.linearRampToValueAtTime(650, t0 + T);

      const f2 = ctx.createBiquadFilter();
      f2.type = "bandpass"; f2.Q.value = 10;
      f2.frequency.setValueAtTime(2300, t0);
      f2.frequency.linearRampToValueAtTime(1050, t0 + T);

      const g1 = ctx.createGain(); g1.gain.value = 0.85;
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      const body = ctx.createGain(); body.gain.value = 0.18;

      // amplitude envelope
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.linearRampToValueAtTime(0.9, t0 + 0.05);
      amp.gain.setValueAtTime(0.85, t0 + 0.4);
      amp.gain.exponentialRampToValueAtTime(0.0008, t0 + T);

      src.connect(f1).connect(g1).connect(amp);
      src.connect(f2).connect(g2).connect(amp);
      src.connect(body).connect(amp);
      amp.connect(ctx.destination);

      src.start(t0); lfo.start(t0);
      src.stop(t0 + T + 0.05); lfo.stop(t0 + T + 0.05);
    } catch (e) {
      /* audio not available — the visual still plays */
    }
  }

  function wireMeow() {
    const btn = document.getElementById("meowBtn");
    const cat = document.getElementById("cat");
    const bubble = document.getElementById("meowBubble");
    if (!btn) return;

    let bubbleTimer = null;
    btn.addEventListener("click", function () {
      playMeow();
      if (cat) {
        cat.classList.remove("is-meowing");
        void cat.offsetWidth; // restart animation
        cat.classList.add("is-meowing");
        cat.addEventListener("animationend", function handler() {
          cat.classList.remove("is-meowing");
          cat.removeEventListener("animationend", handler);
        });
      }
      if (bubble) {
        bubble.classList.add("is-shown");
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function () { bubble.classList.remove("is-shown"); }, 1300);
      }
    });
  }

  /* --------------------- ambient petals/motes ------------------ */
  function spawnPetals() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const host = document.getElementById("petals");
    if (!host) return;
    const COUNT = 14;
    for (let i = 0; i < COUNT; i++) {
      const p = el("span", "petal");
      const size = 8 + Math.random() * 12;
      p.style.left = Math.random() * 100 + "vw";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.animationDuration = 9 + Math.random() * 12 + "s";
      p.style.animationDelay = -Math.random() * 16 + "s";
      p.style.opacity = (0.4 + Math.random() * 0.5).toFixed(2);
      host.appendChild(p);
    }
  }

  /* ---------------------------- init --------------------------- */
  function init() {
    load();
    wireTheme();
    wireForms();
    wireMeow();
    primeDefaults();
    renderAll();
    updateStats();
    spawnPetals();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
