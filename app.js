/* ============================================================
   PUMPING LEMMA DEMONSTRATION TOOL — app.js
   ============================================================ */

"use strict";

// ── LANGUAGE DEFINITIONS ──────────────────────────────────────
const LANGUAGE_PRESETS = {
  abn: {
    name: "aⁿbⁿ",
    defaultString: "aaabbb",
    description: "Strings with equal counts of a's followed by b's.",
    isInLanguage(s) {
      const m = s.match(/^(a*)(b*)$/);
      if (!m) return false;
      return m[1].length === m[2].length && m[1].length > 0;
    },
  },
  anbn_mod: {
    name: "aⁿbⁿ (n≥0)",
    defaultString: "aabb",
    description: "Empty string or equal a's then b's.",
    isInLanguage(s) {
      if (s === "") return true;
      const m = s.match(/^(a*)(b*)$/);
      if (!m) return false;
      return m[1].length === m[2].length;
    },
  },
  a_star_b_star: {
    name: "a*b*",
    defaultString: "aaabb",
    description: "Zero or more a's followed by zero or more b's.",
    isInLanguage(s) {
      return /^a*b*$/.test(s);
    },
  },
  palindrome: {
    name: "ww^R",
    defaultString: "abba",
    description: "Strings that are even-length palindromes (w concatenated with its reverse).",
    isInLanguage(s) {
      if (s.length % 2 !== 0) return false;
      const half = s.length / 2;
      const w = s.slice(0, half);
      const wr = s.slice(half);
      return w === wr.split("").reverse().join("");
    },
  },
  equal_ab: {
    name: "#a = #b",
    defaultString: "aabb",
    description: "Strings over {a,b} with equal number of a's and b's.",
    isInLanguage(s) {
      if (!/^[ab]*$/.test(s)) return false;
      const na = (s.match(/a/g) || []).length;
      const nb = (s.match(/b/g) || []).length;
      return na === nb;
    },
  },
  custom: {
    name: "Custom",
    defaultString: "",
    description: "User-defined string; membership is determined by the input.",
    isInLanguage() { return true; /* placeholder */ },
  },
};

// ── STATE ─────────────────────────────────────────────────────
const state = {
  language: "custom",
  inputString: "",
  p: 3,
  xLen: 1,
  yLen: 2,
  pumpCount: 2,
  activeTab: -1,
};

// ── DOM REFERENCES ────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  languageSelect:   $("languageSelect"),
  inputString:      $("inputString"),
  pumpingLength:    $("pumpingLength"),
  pumpingLengthVal: $("pumpingLengthVal"),
  splitX:           $("splitX"),
  splitXVal:        $("splitXVal"),
  splitY:           $("splitY"),
  splitYVal:        $("splitYVal"),
  pumpCount:        $("pumpCount"),
  pumpCountVal:     $("pumpCountVal"),
  btnDemonstrate:   $("btnDemonstrate"),
  decompChars:      $("decompChars"),
  decompBrackets:   $("decompBrackets"),
  decompInfo:       $("decompInfo"),
  pumpTabs:         $("pumpTabs"),
  pumpDisplay:      $("pumpDisplay"),
  verdictBox:       $("verdictBox"),
  proofSteps:       $("proofSteps"),
};

// ── INIT ──────────────────────────────────────────────────────
function init() {
  syncSlider(els.pumpingLength, els.pumpingLengthVal);
  syncSlider(els.splitX, els.splitXVal);
  syncSlider(els.splitY, els.splitYVal);
  syncSlider(els.pumpCount, els.pumpCountVal);

  els.languageSelect.addEventListener("change", onLanguageChange);
  els.btnDemonstrate.addEventListener("click", demonstrate);

  // Live slider feedback
  els.pumpingLength.addEventListener("input", () => {
    syncSlider(els.pumpingLength, els.pumpingLengthVal);
    clampSplitters();
  });
  els.splitX.addEventListener("input", () => syncSlider(els.splitX, els.splitXVal));
  els.splitY.addEventListener("input", () => syncSlider(els.splitY, els.splitYVal));
  els.pumpCount.addEventListener("input", () => syncSlider(els.pumpCount, els.pumpCountVal));

  // Show empty states
  renderEmptyStates();
}

function syncSlider(input, label) {
  label.textContent = input.value;
  // Update gradient fill
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, var(--bg3) ${pct}%)`;
}

function clampSplitters() {
  const p = parseInt(els.pumpingLength.value);
  els.splitX.max = Math.max(0, p - 1);
  els.splitY.max = Math.max(1, p);
  if (parseInt(els.splitX.value) > parseInt(els.splitX.max)) {
    els.splitX.value = els.splitX.max;
    syncSlider(els.splitX, els.splitXVal);
  }
  if (parseInt(els.splitY.value) > parseInt(els.splitY.max)) {
    els.splitY.value = els.splitY.max;
    syncSlider(els.splitY, els.splitYVal);
  }
}

function onLanguageChange() {
  const key = els.languageSelect.value;
  state.language = key;
  if (key !== "custom" && LANGUAGE_PRESETS[key]?.defaultString) {
    els.inputString.value = LANGUAGE_PRESETS[key].defaultString;
  }
}

function renderEmptyStates() {
  [els.decompBrackets, els.decompInfo, els.pumpTabs, els.proofSteps].forEach(el => {
    el.innerHTML = "";
  });
  els.decompChars.innerHTML = `<div class="empty-vis"><span class="empty-glyph">◌</span> Enter a string and run demonstration</div>`;
  els.pumpDisplay.innerHTML = `<div class="empty-vis"><span class="empty-glyph">◌</span> Pumped strings appear here</div>`;
  els.verdictBox.className = "verdict-box unknown";
  els.verdictBox.innerHTML = `
    <div class="verdict-placeholder">
      <span class="vp-icon">✦</span>
      <p>Run a demonstration to see the analysis</p>
    </div>`;
}

// ── CORE LOGIC ────────────────────────────────────────────────
function demonstrate() {
  const rawStr = els.inputString.value.trim();
  if (!rawStr) { alert("Please enter a string to analyze."); return; }
  if (!/^[ab]+$/.test(rawStr)) { alert("String must only contain characters 'a' and 'b'."); return; }

  const s   = rawStr;
  const p   = parseInt(els.pumpingLength.value);
  const xL  = parseInt(els.splitX.value);
  const yL  = parseInt(els.splitY.value);
  const i   = parseInt(els.pumpCount.value);
  const key = els.languageSelect.value;

  // Validate decomposition
  if (xL + yL > p) {
    alert(`Constraint violated: |xy| = ${xL + yL} must be ≤ p = ${p}. Adjust x and y lengths.`);
    return;
  }
  if (xL + yL > s.length) {
    alert(`|xy| = ${xL + yL} exceeds string length ${s.length}. Adjust lengths.`);
    return;
  }

  const xPart = s.slice(0, xL);
  const yPart = s.slice(xL, xL + yL);
  const zPart = s.slice(xL + yL);

  state.s = s; state.p = p; state.xPart = xPart; state.yPart = yPart; state.zPart = zPart;
  state.i = i; state.key = key; state.activeTab = i;

  renderDecomposition(s, xPart, yPart, zPart, p);
  renderPumping(xPart, yPart, zPart, i, key);
  renderVerdict(s, xPart, yPart, zPart, p, i, key);
}

// ── RENDER DECOMPOSITION ──────────────────────────────────────
function renderDecomposition(s, x, y, z, p) {
  const CHAR_W = 44; // px per character slot

  // Build character boxes
  els.decompChars.innerHTML = "";
  for (let idx = 0; idx < s.length; idx++) {
    const ch = s[idx];
    let partClass = "part-z";
    if (idx < x.length) partClass = "part-x";
    else if (idx < x.length + y.length) partClass = "part-y";

    const box = document.createElement("div");
    box.className = `char-box ${partClass}`;
    box.style.animationDelay = `${idx * 35}ms`;
    box.innerHTML = `${ch}<span class="char-index">${idx}</span>`;
    els.decompChars.appendChild(box);
  }

  // Build bracket labels
  els.decompBrackets.innerHTML = "";
  const parts = [
    { label: "x", len: x.length, cls: "brace-x" },
    { label: "y", len: y.length, cls: "brace-y" },
    { label: "z", len: z.length, cls: "brace-z" },
  ];

  parts.forEach(({ label, len, cls }) => {
    if (len === 0 && label !== "z") return;
    const brace = document.createElement("div");
    brace.className = `brace-group ${cls}`;
    brace.style.width = `${len * (CHAR_W + 4) - 4}px`;
    brace.style.minWidth = `${len * (CHAR_W + 4) - 4}px`;
    brace.textContent = label;
    els.decompBrackets.appendChild(brace);
  });

  // Info chips
  els.decompInfo.innerHTML = `
    <div class="info-chip"><span class="chip-part x">x</span> <span class="chip-val">= "${x || "ε"}" (|x|=${x.length})</span></div>
    <div class="info-chip"><span class="chip-part y">y</span> <span class="chip-val">= "${y || "ε"}" (|y|=${y.length})</span></div>
    <div class="info-chip"><span class="chip-part z">z</span> <span class="chip-val">= "${z || "ε"}" (|z|=${z.length})</span></div>
    <div class="info-chip" style="margin-left:auto">
      <span style="color:var(--text-muted);font-size:0.72rem">|xy| = ${x.length + y.length} ≤ p=${p} 
        <span class="${x.length + y.length <= p ? "constraint-ok" : "constraint-warn"}">
          ${x.length + y.length <= p ? "✔" : "✘"}
        </span>
      </span>
    </div>
  `;
}

// ── RENDER PUMPING ────────────────────────────────────────────
function renderPumping(x, y, z, selectedI, langKey) {
  const maxI = Math.max(selectedI, 4);

  // Tabs: i = 0,1,2,...maxI
  els.pumpTabs.innerHTML = "";
  for (let i = 0; i <= maxI; i++) {
    const tab = document.createElement("button");
    tab.className = "pump-tab" + (i === selectedI ? " active" : "");
    tab.textContent = `i = ${i}`;
    tab.dataset.i = i;
    tab.addEventListener("click", () => {
      document.querySelectorAll(".pump-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderPumpRows(x, y, z, parseInt(tab.dataset.i), langKey);
    });
    els.pumpTabs.appendChild(tab);
  }

  renderPumpRows(x, y, z, selectedI, langKey);
}

function renderPumpRows(x, y, z, highlightI, langKey) {
  els.pumpDisplay.innerHTML = "";
  const maxI = Math.max(highlightI, 4);

  for (let i = 0; i <= maxI; i++) {
    const pumped = x + y.repeat(i) + z;
    const inLang = checkMembership(pumped, langKey);

    const row = document.createElement("div");
    row.className = "pump-row";
    row.style.animationDelay = `${i * 40}ms`;
    if (i !== highlightI) row.style.opacity = "0.45";

    const label = document.createElement("div");
    label.className = "pump-label";
    label.textContent = `i=${i}`;

    const strEl = document.createElement("div");
    strEl.className = "pump-string";

    // x chars
    buildPumpChars(strEl, x, "part-x");
    // y^i chars
    const yRepeated = y.repeat(i);
    buildPumpChars(strEl, yRepeated, "part-y");
    // z chars
    buildPumpChars(strEl, z, "part-z");

    if (pumped === "") {
      const eps = document.createElement("span");
      eps.style.cssText = "font-family:var(--font-mono);color:var(--ink-3);font-size:0.82rem;padding:8px";
      eps.textContent = "ε (empty)";
      strEl.appendChild(eps);
    }

    const status = document.createElement("div");
    status.className = `pump-status ${inLang ? "valid" : "invalid"}`;
    status.textContent = inLang ? `✔ In L` : `✘ Not in L`;

    row.appendChild(label);
    row.appendChild(strEl);
    row.appendChild(status);
    els.pumpDisplay.appendChild(row);
  }
}

function buildPumpChars(container, str, cls) {
  for (const ch of str) {
    const c = document.createElement("div");
    c.className = `pump-char ${cls}`;
    c.textContent = ch;
    container.appendChild(c);
  }
}

// ── MEMBERSHIP CHECK ──────────────────────────────────────────
function checkMembership(s, langKey) {
  if (langKey === "custom") return true; // can't determine
  return LANGUAGE_PRESETS[langKey]?.isInLanguage(s) ?? true;
}

// ── RENDER VERDICT ────────────────────────────────────────────
function renderVerdict(s, x, y, z, p, i, langKey) {
  const isCustom = langKey === "custom";
  const lang = LANGUAGE_PRESETS[langKey];

  // Analyze all pumped strings
  let allValid = true;
  let pumpsOutside = [];

  const maxCheck = Math.max(i, 5);
  for (let k = 0; k <= maxCheck; k++) {
    const pumped = x + y.repeat(k) + z;
    const inL = checkMembership(pumped, langKey);
    if (!inL) { allValid = false; pumpsOutside.push({ k, pumped }); }
  }

  const sInL = checkMembership(s, langKey);
  const yLenOk = y.length >= 1;
  const xyLenOk = x.length + y.length <= p;
  const sLongEnough = s.length >= p;

  // Determine conclusion
  let verdict, cls, icon, explanation;

  if (isCustom) {
    verdict = "Custom Mode";
    cls = "unknown";
    icon = "🔍";
    explanation = "Language membership is assumed true for custom mode. Select a preset language to get an automated verdict.";
  } else if (!sInL) {
    verdict = "String not in L";
    cls = "unknown";
    icon = "⚠️";
    explanation = `The input string "${s}" is not in ${lang.name}. The pumping lemma only applies to strings already in L.`;
  } else if (!sLongEnough) {
    verdict = "String too short";
    cls = "unknown";
    icon = "📏";
    explanation = `The string has length ${s.length} but p = ${p}. Choose a string with |s| ≥ p to apply the lemma.`;
  } else if (!yLenOk || !xyLenOk) {
    verdict = "Invalid decomposition";
    cls = "unknown";
    icon = "⚙️";
    explanation = `The split violates constraints: |y| ≥ 1 (${yLenOk ? "✔" : "✘"}) and |xy| ≤ p (${xyLenOk ? "✔" : "✘"}).`;
  } else if (allValid) {
    verdict = "Pumping Condition Holds";
    cls = "regular";
    icon = "✅";
    explanation = `For this decomposition, xy<sup>i</sup>z ∈ ${lang.name} for all i ≥ 0. The condition holds — this does NOT prove regularity (only one decomposition was tested), but it's consistent with it.`;
  } else {
    verdict = "Pumping Condition Violated!";
    cls = "not-regular";
    icon = "❌";
    const ex = pumpsOutside[0];
    explanation = `For i = ${ex.k}, the pumped string "<code>${ex.pumped}</code>" is NOT in ${lang.name}. This demonstrates that the pumping lemma fails for this decomposition, supporting that the language may NOT be regular.`;
  }

  els.verdictBox.className = `verdict-box ${cls}`;
  els.verdictBox.innerHTML = `
    <div class="verdict-inner">
      <div class="verdict-icon">${icon}</div>
      <div class="verdict-text">
        <h3>${verdict}</h3>
        <p>${explanation}</p>
      </div>
    </div>`;

  // Proof steps
  renderProofSteps(s, x, y, z, p, i, langKey, sInL, sLongEnough, allValid, pumpsOutside);
}

function renderProofSteps(s, x, y, z, p, i, langKey, sInL, sLongEnough, allValid, pumpsOutside) {
  const isCustom = langKey === "custom";
  const lang = LANGUAGE_PRESETS[langKey];

  const steps = [
    {
      n: "Step 1",
      text: `Assume for contradiction that <strong>${isCustom ? "L" : lang.name}</strong> is regular. Then by the Pumping Lemma, there exists a pumping length <strong>p = ${p}</strong>.`
    },
    {
      n: "Step 2",
      text: `Choose the string <code>${s}</code> (length ${s.length}${sLongEnough ? " ≥" : " <"} p = ${p}). 
             ${sInL && !isCustom ? `This string is in ${lang.name}.` : isCustom ? "" : `⚠ This string is not in L.`}`
    },
    {
      n: "Step 3",
      text: `By the lemma, <em>any</em> decomposition <strong>s = xyz</strong> with |xy| ≤ p and |y| ≥ 1 must satisfy xy<sup>i</sup>z ∈ L for all i ≥ 0.<br>
             Current split: <code>x = "${x || "ε"}"</code>, <code>y = "${y}"</code>, <code>z = "${z || "ε"}"</code> — |xy| = ${x.length + y.length}, |y| = ${y.length}.`
    },
    {
      n: "Step 4",
      text: allValid || isCustom
        ? `For all tested values of i (0 to ${Math.max(i, 4)}), xy<sup>i</sup>z <strong>${isCustom ? "(assumed) stays in L" : "stays in L"}</strong>. Try other decompositions or larger strings to find a violation.`
        : `Choose <strong>i = ${pumpsOutside[0].k}</strong>: the pumped string <code>${pumpsOutside[0].pumped}</code> is <strong>NOT in L</strong>. This is a contradiction!`
    },
    {
      n: "Conclusion",
      text: allValid || isCustom
        ? `No violation was found for this decomposition. The pumping lemma is <strong>not violated here</strong>. Note: to <em>prove</em> a language is not regular, you must show the lemma fails for <em>all</em> decompositions.`
        : `Since we found a decomposition where xy<sup>i</sup>z ∉ L, the assumption that L is regular <strong>leads to contradiction</strong>. Therefore, <strong>L is NOT regular</strong> (for this string/decomposition pair).`
    }
  ];

  els.proofSteps.innerHTML = steps.map((st, idx) =>
    `<div class="proof-step" style="animation-delay:${idx * 60}ms">
       <span class="step-num">${st.n}</span>
       <span class="step-text">${st.text}</span>
     </div>`
  ).join("");
}

// ── START ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);
