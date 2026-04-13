/**
 * Pumping Lemma Visualizer — main.js
 * =====================================================
 * Handles:
 *  1. View transitions (Landing ↔ Tool)
 *  2. String decomposition into x, y, z
 *  3. Visual string-builder rendering
 *  4. Pumping action (xy^i z)
 *  5. Constraint validation and verdict
 * =====================================================
 */

/* -------------------------------------------------------
   1.  VIEW TRANSITIONS
   ------------------------------------------------------- */

const landing = document.getElementById('landing');
const tool    = document.getElementById('tool');

/**
 * Transition to the tool interface.
 * Removes 'active' from landing, adds it to tool.
 */
function showTool() {
  landing.classList.remove('active');
  // Brief delay so CSS opacity transition plays cleanly
  setTimeout(() => {
    landing.style.display = 'none';
    tool.style.display    = 'flex';
    tool.style.flexDirection = 'column';
    // Trigger reflow so transition fires
    requestAnimationFrame(() => tool.classList.add('active'));
  }, 320);
}

/**
 * Return to the landing page (Reset).
 */
function showLanding() {
  tool.classList.remove('active');
  setTimeout(() => {
    tool.style.display    = 'none';
    landing.style.display = '';
    requestAnimationFrame(() => landing.classList.add('active'));
  }, 320);
}

document.getElementById('btn-start').addEventListener('click', showTool);
document.getElementById('btn-reset').addEventListener('click', showLanding);


/* -------------------------------------------------------
   2.  LANGUAGE DEFINITIONS
   ------------------------------------------------------- */

/**
 * Language testers — given a string, return true if it
 * belongs to the language, false otherwise.
 *
 * Extend this object to add more languages.
 */
const LANGUAGES = {
  abn: {
    name: '{ aⁿbⁿ | n ≥ 1 }',
    /**
     * Checks: string is all a's followed by all b's,
     * equal counts, at least one of each.
     */
    test(str) {
      const m = str.match(/^(a+)(b+)$/);
      if (!m) return false;
      return m[1].length === m[2].length;
    },
    defaultW: 'aaabbb',
  },
  anbn_custom: {
    name: 'Custom',
    test(_str) { return null; },  // null = "unknown / not checked"
    defaultW: '',
  },
};


/* -------------------------------------------------------
   3.  STATE
   ------------------------------------------------------- */

const state = {
  w:   'aaabbb',   // full input string
  xLen: 1,         // length of x
  yLen: 2,         // length of y
  p:    3,         // pumping length
  i:    1,         // pump exponent
  lang: 'abn',     // selected language key
};


/* -------------------------------------------------------
   4.  DOM REFERENCES
   ------------------------------------------------------- */

const inpW          = document.getElementById('inp-w');
const inpX          = document.getElementById('inp-x');
const inpY          = document.getElementById('inp-y');
const inpP          = document.getElementById('inp-p');
const selLang       = document.getElementById('sel-language');
const sliderI       = document.getElementById('slider-i');
const displayI      = document.getElementById('display-i');
const btnPumpUp     = document.getElementById('btn-pump-up');
const btnPumpDown   = document.getElementById('btn-pump-down');

const stringDisplay = document.getElementById('string-display');
const pumpedString  = document.getElementById('pumped-string');
const pumpedExp     = document.getElementById('pumped-exp');
const expLabel      = document.getElementById('exp-label');

const verdictEl     = document.getElementById('verdict');
const verdictIcon   = document.getElementById('verdict-icon');
const verdictText   = document.getElementById('verdict-text');

const lenW          = document.getElementById('len-w');
const lenX          = document.getElementById('len-x');
const lenY          = document.getElementById('len-y');
const lenZ          = document.getElementById('len-z');
const lenPumped     = document.getElementById('len-pumped');
const lenExp        = document.getElementById('len-exp');

const cYW           = document.getElementById('c-yw');
const cY            = document.getElementById('c-y');
const cXY           = document.getElementById('c-xy');


/* -------------------------------------------------------
   5.  CORE RENDER FUNCTION
   ------------------------------------------------------- */

/**
 * Derives the pumped string xy^i z from state,
 * then updates all visual elements.
 */
function render() {
  const { w, xLen, yLen, p, i } = state;

  // Clamp lengths to valid ranges
  const safeXLen = Math.max(0, Math.min(xLen, w.length));
  const safeYLen = Math.max(0, Math.min(yLen, w.length - safeXLen));
  const zStart   = safeXLen + safeYLen;

  const x = w.slice(0, safeXLen);
  const y = w.slice(safeXLen, zStart);
  const z = w.slice(zStart);

  // Build pumped string: x + y repeated i times + z
  const yPumped  = y.repeat(Math.max(0, i));
  const pumped   = x + yPumped + z;

  // ---- Update length readouts ----
  lenW.textContent      = w.length;
  lenX.textContent      = x.length;
  lenY.textContent      = y.length;
  lenZ.textContent      = z.length;
  lenPumped.textContent = pumped.length;
  lenExp.textContent    = i;

  // ---- Update exponent labels ----
  pumpedExp.textContent = i;
  expLabel.textContent  = i;

  // ---- Constraint checks ----
  const passWP = w.length >= p;
  const passY  = y.length > 0;
  const passXY = (x.length + y.length) <= p;

  setConstraint(cYW, passWP, `|w| = ${w.length} ≥ p = ${p}`);
  setConstraint(cY,  passY,  `|y| = ${y.length} > 0`);
  setConstraint(cXY, passXY, `|xy| = ${x.length + y.length} ≤ p = ${p}`);

  // ---- Render visual string ----
  renderStringDisplay(x, y, z, i);

  // ---- Pumped string text ----
  pumpedString.textContent = pumped || '(empty)';

  // ---- Verdict ----
  updateVerdict(pumped, passY, passXY, passWP);
}


/**
 * Renders the coloured character cells in #string-display.
 * For i > 1 the extra y-copies are appended with 'pumped-new' class.
 */
function renderStringDisplay(x, y, z, i) {
  stringDisplay.innerHTML = '';

  const addChar = (char, partClass, isNew = false) => {
    const cell = document.createElement('span');
    cell.className = `char-cell ${partClass}${isNew ? ' pumped-new' : ''}`;
    cell.textContent = char;
    stringDisplay.appendChild(cell);
  };

  const addDivider = () => {
    const div = document.createElement('span');
    div.className = 'part-divider';
    stringDisplay.appendChild(div);
  };

  // x part
  for (const ch of x) addChar(ch, 'part-x');
  if (x.length > 0 && (y.length > 0 || z.length > 0)) addDivider();

  // y part — first copy is the "original", rest are "pumped-new"
  const yCopies = Math.max(0, i);
  for (let copy = 0; copy < yCopies; copy++) {
    for (const ch of y) addChar(ch, 'part-y', copy > 0);
  }
  if (y.length > 0 && z.length > 0) addDivider();

  // z part
  for (const ch of z) addChar(ch, 'part-z');

  // Edge case: if y is empty but constraints not met, show placeholder
  if (x.length === 0 && y.length === 0 && z.length === 0 && stringDisplay.children.length === 0) {
    stringDisplay.innerHTML = '<span style="color:var(--ink-faint);font-family:var(--font-mono);font-size:0.8rem;padding:0.5rem;">Enter a string above.</span>';
  }
}


/**
 * Sets pass/fail styling and title text on a constraint row.
 */
function setConstraint(el, passes, title) {
  el.classList.remove('pass', 'fail');
  el.classList.add(passes ? 'pass' : 'fail');
  el.querySelector('.c-icon').textContent = passes ? '✓' : '✗';
  el.title = title;
}


/**
 * Evaluates whether the pumped string is in the language
 * and updates the verdict display accordingly.
 */
function updateVerdict(pumped, passY, passXY, passWP) {
  verdictEl.classList.remove('pass', 'fail', 'warn');
  const lang = LANGUAGES[state.lang];

  // If constraints aren't satisfied, warn first
  if (!passWP) {
    verdictEl.classList.add('warn');
    verdictIcon.textContent = '⚠';
    verdictText.textContent = `|w| must be ≥ p (currently |w| = ${state.w.length}, p = ${state.p}). Choose a longer string or smaller p.`;
    return;
  }
  if (!passY) {
    verdictEl.classList.add('warn');
    verdictIcon.textContent = '⚠';
    verdictText.textContent = '|y| = 0 — y must be non-empty (Condition 1 violated).';
    return;
  }
  if (!passXY) {
    verdictEl.classList.add('warn');
    verdictIcon.textContent = '⚠';
    verdictText.textContent = `|xy| > p (Condition 2 violated). Reduce |x| + |y| to at most p = ${state.p}.`;
    return;
  }

  // Check membership for known languages
  const inLang = lang.test(pumped);

  if (inLang === null) {
    // Custom / unknown language
    verdictEl.classList.add('warn');
    verdictIcon.textContent = '?';
    verdictText.textContent = `xy${String.fromCharCode(8305)}z = "${pumped}" — Define your language to check membership.`;
  } else if (inLang) {
    verdictEl.classList.add('pass');
    verdictIcon.textContent = '✓';
    verdictText.textContent = `xy${String.fromCharCode(8305)}z = "${pumped}" ∈ L. The pumped string is still in the language.`;
  } else {
    verdictEl.classList.add('fail');
    verdictIcon.textContent = '✗';
    verdictText.textContent = `xy${String.fromCharCode(8305)}z = "${pumped}" ∉ L. This split violates the Pumping Lemma — the language is NOT regular!`;
  }
}


/* -------------------------------------------------------
   6.  INPUT EVENT LISTENERS
   ------------------------------------------------------- */

/** Sync a numeric input value into state and re-render. */
function bindNumericInput(el, stateKey, min = 0, max = Infinity) {
  el.addEventListener('input', () => {
    let val = parseInt(el.value, 10);
    if (isNaN(val)) return;
    val = Math.max(min, Math.min(max, val));
    state[stateKey] = val;
    render();
  });
}

// String w
inpW.addEventListener('input', () => {
  state.w = inpW.value;
  // Auto-adjust xLen/yLen if they exceed new string length
  state.xLen = Math.min(state.xLen, state.w.length);
  state.yLen = Math.min(state.yLen, Math.max(0, state.w.length - state.xLen));
  inpX.value = state.xLen;
  inpY.value = state.yLen;
  render();
});

bindNumericInput(inpX, 'xLen', 0);
bindNumericInput(inpY, 'yLen', 0);
bindNumericInput(inpP, 'p',    1, 20);

// Language selector
selLang.addEventListener('change', () => {
  state.lang = selLang.value;
  const def  = LANGUAGES[state.lang];
  if (def.defaultW) {
    state.w    = def.defaultW;
    inpW.value = def.defaultW;
    // Reset split to sensible defaults
    state.xLen = 1; inpX.value = 1;
    state.yLen = 2; inpY.value = 2;
    state.i    = 1; sliderI.value = 1; displayI.textContent = 1;
  }
  render();
});

// Pump slider
sliderI.addEventListener('input', () => {
  state.i = parseInt(sliderI.value, 10);
  displayI.textContent = state.i;
  render();
});

// Pump up / down buttons
btnPumpUp.addEventListener('click', () => {
  const max = parseInt(sliderI.max, 10);
  if (state.i < max) {
    state.i++;
    sliderI.value = state.i;
    displayI.textContent = state.i;
    render();
  }
});

btnPumpDown.addEventListener('click', () => {
  if (state.i > 0) {
    state.i--;
    sliderI.value = state.i;
    displayI.textContent = state.i;
    render();
  }
});


/* -------------------------------------------------------
   7.  INITIAL RENDER
   ------------------------------------------------------- */

// Sync DOM inputs to initial state values
inpW.value = state.w;
inpX.value = state.xLen;
inpY.value = state.yLen;
inpP.value = state.p;
sliderI.value = state.i;
displayI.textContent = state.i;

render();
