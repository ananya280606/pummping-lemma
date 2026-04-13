/**
 * Pumping Lemma Visualizer — js/main.js
 * Matches index.html exactly. Works as local file (file://).
 */
"use strict";

/* ════════════════════════════════════════════════════
   1. LANGUAGE REGISTRY
   ════════════════════════════════════════════════════ */
class Language {
  constructor(cfg) { Object.assign(this, cfg); }
  inLanguage(s) { return this.test(s); }
}

const LANGS = new Map();
function reg(cfg) { LANGS.set(cfg.key, new Language(cfg)); }

/* Not Regular */
reg({ key:"abn",         name:"aⁿbⁿ",          isRegular:false, defaultStr:"aaabbb",     alphabet:"ab",
      desc:"Strings of n a's followed by n b's (n≥1). Classic proof target.",
      test(s){ const m=s.match(/^(a+)(b+)$/); return !!m&&m[1].length===m[2].length; }});

reg({ key:"anbncn",      name:"aⁿbⁿcⁿ",         isRegular:false, defaultStr:"aaabbbccc",  alphabet:"abc",
      desc:"Equal counts of a, b, c in order. Not even context-free.",
      test(s){ const m=s.match(/^(a+)(b+)(c+)$/); return !!m&&m[1].length===m[2].length&&m[2].length===m[3].length; }});

reg({ key:"palindrome",  name:"ww^R",            isRegular:false, defaultStr:"abbaabba",   alphabet:"ab",
      desc:"Even-length strings where the 2nd half reverses the 1st.",
      test(s){ if(s.length%2!==0)return false; const h=s.length/2; return s.slice(0,h)===s.slice(h).split("").reverse().join(""); }});

reg({ key:"equal_ab",    name:"#a = #b",         isRegular:false, defaultStr:"aabb",       alphabet:"ab",
      desc:"Strings over {a,b} with equal counts of a's and b's.",
      test(s){ if(!/^[ab]*$/.test(s))return false; return [...s].reduce((d,c)=>d+(c==="a"?1:-1),0)===0; }});

reg({ key:"prime",       name:"aᵖ (p prime)",    isRegular:false, defaultStr:"aaaaaaa",    alphabet:"a",
      desc:"Strings of a's whose length is a prime number.",
      test(s){ if(!/^a+$/.test(s))return false; const n=s.length; if(n<2)return false;
               for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0)return false; return true; }});

reg({ key:"square",      name:"aⁿ²",             isRegular:false, defaultStr:"aaaaaaaaa",  alphabet:"a",
      desc:"Strings of a's whose length is a perfect square.",
      test(s){ if(!/^a+$/.test(s))return false; const q=Math.sqrt(s.length); return Number.isInteger(q); }});

/* Regular */
reg({ key:"a_star_b_star", name:"a*b*",           isRegular:true,  defaultStr:"aaabb",      alphabet:"ab",
      desc:"Any number of a's followed by any number of b's. This IS regular.",
      test(s){ return /^a*b*$/.test(s); }});

reg({ key:"ends_ab",     name:"w ends in 'ab'",   isRegular:true,  defaultStr:"bbaab",      alphabet:"ab",
      desc:"Strings over {a,b} that end with 'ab'. This IS regular.",
      test(s){ return /^[ab]*ab$/.test(s)||s==="ab"; }});

reg({ key:"custom",      name:"Custom",           isRegular:null,  defaultStr:"",           alphabet:"abc",
      desc:"Custom input — membership not verified automatically.",
      test(){ return true; }});

/* ════════════════════════════════════════════════════
   2. STATE
   ════════════════════════════════════════════════════ */
const S = {
  s:"", langKey:"custom", p:3, pumpI:2,
  yStart:1, yEnd:2,
  isDragging:false, dragAnchor:-1,
  tourActive:false, tourStep:0,

  get xPart(){ return this.s.slice(0, this.yStart); },
  get yPart(){ return this.s.slice(this.yStart, this.yEnd+1); },
  get zPart(){ return this.s.slice(this.yEnd+1); },
  get xyLen(){ return this.yEnd+1; },
  get yLen() { return Math.max(0, this.yEnd-this.yStart+1); },
};

/* ════════════════════════════════════════════════════
   3. DOM CACHE
   ════════════════════════════════════════════════════ */
const D = {};
function cacheDOM() {
  const ids = [
    "landingPage","toolPage",
    "btnGetStarted","btnBack","btnTour","tourOverlay",
    "languageSelect","langBadge","inputString","stringNote",
    "pumpingLength","pLenVal","pumpCount","pCountVal",
    "btnDemo",
    "decompArea","decompHint","bracketRow","chipRow",
    "tabRow","pumpList",
    "verdictBox","proofSteps",
    "cond1","cond2","cond3","tick1","tick2","tick3"
  ];
  ids.forEach(id => { D[id] = document.getElementById(id); });
}

/* ════════════════════════════════════════════════════
   4. PAGE TRANSITIONS
   ════════════════════════════════════════════════════ */
function goToTool() {
  D.landingPage.classList.add("fade-out");
  setTimeout(() => {
    D.landingPage.style.display = "none";
    D.landingPage.classList.remove("fade-out");
    D.toolPage.style.display    = "flex";
    D.toolPage.classList.add("fade-in");
    setTimeout(() => D.toolPage.classList.remove("fade-in"), 400);
  }, 280);
}

function goToLanding() {
  if (S.tourActive) endTour();
  D.toolPage.classList.add("fade-out");
  setTimeout(() => {
    D.toolPage.style.display    = "none";
    D.toolPage.classList.remove("fade-out");
    D.landingPage.style.display = "flex";
    D.landingPage.classList.add("fade-in");
    setTimeout(() => D.landingPage.classList.remove("fade-in"), 400);
    resetTool();
  }, 280);
}

/* ════════════════════════════════════════════════════
   5. SLIDER SYNC
   ════════════════════════════════════════════════════ */
function syncSlider(inp, badge) {
  const pct = ((inp.value - inp.min) / (inp.max - inp.min)) * 100;
  inp.style.background =
    `linear-gradient(90deg, var(--sg2) ${pct}%, var(--c2) ${pct}%)`;
  badge.textContent = inp.value;
}

/* ════════════════════════════════════════════════════
   6. LANGUAGE SELECT & BADGE
   ════════════════════════════════════════════════════ */
function onLangChange() {
  const key  = D.languageSelect.value;
  S.langKey  = key;
  const lang = LANGS.get(key);
  if (lang.defaultStr) D.inputString.value = lang.defaultStr;
  updateLangBadge(lang);
  validateString();
}

function updateLangBadge(lang) {
  if (lang.isRegular === null) {
    D.langBadge.style.display = "none";
    return;
  }
  D.langBadge.style.display = "flex";
  if (lang.isRegular) {
    D.langBadge.className = "lang-badge is-regular";
    D.langBadge.textContent = "✔  Regular language";
  } else {
    D.langBadge.className = "lang-badge is-irregular";
    D.langBadge.textContent = "✘  Not regular";
  }
}

function validateString() {
  const key  = S.langKey;
  const lang = LANGS.get(key);
  const s    = D.inputString.value.trim();
  const note = D.stringNote;
  if (!s || key === "custom") { note.textContent=""; note.className="field-note"; return; }
  const ok = new RegExp(`^[${lang.alphabet}]*$`).test(s);
  if (!ok) {
    note.textContent = `⚠ Only: ${lang.alphabet.split("").join(", ")}`;
    note.className = "field-note fail"; return;
  }
  const inL = lang.inLanguage(s);
  note.textContent = inL ? `✔ "${s}" ∈ ${lang.name}` : `✘ "${s}" ∉ ${lang.name}`;
  note.className = `field-note ${inL?"ok":"fail"}`;
}

/* ════════════════════════════════════════════════════
   7. INTERACTIVE DECOMP — click / drag on tiles
   ════════════════════════════════════════════════════ */
function buildStrip(s) {
  D.decompArea.innerHTML = "";
  if (!s) {
    D.decompArea.innerHTML =
      `<p class="empty-msg"><span class="empty-dot">◌</span> Enter a string and click Demonstrate</p>`;
    return;
  }

  const strip = document.createElement("div");
  strip.className = "char-strip";

  for (let i = 0; i < s.length; i++) {
    const tile = document.createElement("div");
    tile.className = "char-tile";
    tile.textContent = s[i];
    tile.dataset.i = i;
    tile.setAttribute("data-i", i);
    tile.setAttribute("tabindex", "0");
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", `Char ${s[i]} pos ${i}`);
    tile.style.animationDelay = `${i*30}ms`;

    tile.addEventListener("mousedown", e => { e.preventDefault(); startDrag(i); });
    tile.addEventListener("mouseenter", ()  => { if(S.isDragging) extendDrag(i); });
    tile.addEventListener("mouseup",    ()  => endDrag());
    tile.addEventListener("keydown",    e   => {
      if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleTile(i); }
    });
    strip.appendChild(tile);
  }

  const hint = document.createElement("p");
  hint.className = "drag-hint";
  hint.textContent = "Click a character to anchor y; drag to extend the selection";

  D.decompArea.appendChild(strip);
  D.decompArea.appendChild(hint);

  paintTiles();
}

function startDrag(i)  { S.isDragging=true; S.dragAnchor=i; S.yStart=i; S.yEnd=i; paintTiles(); }
function extendDrag(i) { if(!S.isDragging)return; S.yStart=Math.min(S.dragAnchor,i); S.yEnd=Math.max(S.dragAnchor,i); paintTiles(); }
function endDrag()     { if(!S.isDragging)return; S.isDragging=false; onDecompChange(); }

function toggleTile(i) {
  if(i>=S.yStart&&i<=S.yEnd){
    if(S.yStart===S.yEnd)return;
    if(i===S.yStart)S.yStart++; else S.yEnd--;
  } else {
    S.yStart=Math.min(S.yStart,i); S.yEnd=Math.max(S.yEnd,i);
  }
  paintTiles(); onDecompChange();
}

function paintTiles() {
  const tiles = D.decompArea.querySelectorAll(".char-tile");
  tiles.forEach((t,i) => {
    t.classList.remove("tx","ty","tz");
    if(i < S.yStart)      t.classList.add("tx");
    else if(i <= S.yEnd)  t.classList.add("ty");
    else                  t.classList.add("tz");
  });
}

function onDecompChange() {
  renderBrackets();
  renderChips();
  updateCondBanner();
}

/* ════════════════════════════════════════════════════
   8. CONDITION BANNER
   ════════════════════════════════════════════════════ */
function updateCondBanner() {
  const { yLen, xyLen, p, langKey, pumpI } = S;
  const isCustom = langKey === "custom";
  const c1 = yLen >= 1;
  const c2 = xyLen <= p;
  let   c3 = true;
  if (!isCustom) {
    const lang = LANGS.get(langKey);
    for(let k=0;k<=Math.max(pumpI,5);k++){
      if(!lang.inLanguage(S.xPart+S.yPart.repeat(k)+S.zPart)){c3=false;break;}
    }
  }
  setCond(D.cond1, D.tick1, c1?"ok":"fail", c1?"✔":"✘");
  setCond(D.cond2, D.tick2, c2?"ok":"fail", c2?"✔":"✘");
  setCond(D.cond3, D.tick3,
    isCustom?"":(c3?"ok":"fail"),
    isCustom?"":(c3?"✔":"✘"));
}

function setCond(el, tick, cls, sym) {
  el.classList.remove("c-ok","c-fail");
  if(cls) el.classList.add(`c-${cls}`);
  tick.textContent = sym;
}

/* ════════════════════════════════════════════════════
   9. BRACKETS & CHIPS
   ════════════════════════════════════════════════════ */
const TW = 44; // tile width px

function renderBrackets() {
  D.bracketRow.innerHTML = "";
  [
    { lbl:"x", len:S.xPart.length, cls:"bx" },
    { lbl:"y", len:S.yPart.length, cls:"by" },
    { lbl:"z", len:S.zPart.length, cls:"bz" },
  ].forEach(({ lbl, len, cls }) => {
    if(!len) return;
    const b = document.createElement("div");
    b.className = `brace ${cls}`;
    b.style.width = b.style.minWidth = `${len*TW-4}px`;
    b.textContent = lbl;
    D.bracketRow.appendChild(b);
  });
}

function renderChips() {
  const { xPart:x, yPart:y, zPart:z, xyLen, p } = S;
  const ok = xyLen <= p;
  D.chipRow.innerHTML = `
    <div class="chip"><span class="chip-lx">x</span> = "${x||"ε"}" (|x|=${x.length})</div>
    <div class="chip"><span class="chip-ly">y</span> = "${y||"ε"}" (|y|=${y.length})</div>
    <div class="chip"><span class="chip-lz">z</span> = "${z||"ε"}" (|z|=${z.length})</div>
    <div class="chip">|xy|=${xyLen} ≤ p=${p} <span class="${ok?"chip-ok":"chip-fail"}">${ok?"✔":"✘"}</span></div>`;
}

/* ════════════════════════════════════════════════════
   10. DEMONSTRATE
   ════════════════════════════════════════════════════ */
function demonstrate() {
  const raw = D.inputString.value.trim();
  if(!raw){ D.stringNote.textContent="⚠ Please enter a string."; D.stringNote.className="field-note fail"; return; }
  const key  = D.languageSelect.value;
  const lang = LANGS.get(key);
  if(!new RegExp(`^[${lang.alphabet}]*$`).test(raw)){
    D.stringNote.textContent=`⚠ Only: ${lang.alphabet.split("").join(", ")}`;
    D.stringNote.className="field-note fail"; return;
  }

  S.s       = raw;
  S.langKey = key;
  S.p       = parseInt(D.pumpingLength.value);
  S.pumpI   = parseInt(D.pumpCount.value);

  // Default y selection if not set sensibly
  S.yStart = Math.min(S.yStart, raw.length-1);
  S.yEnd   = Math.min(S.yEnd,   raw.length-1);
  if(S.yStart < 0) S.yStart = Math.min(1, raw.length-1);
  if(S.yEnd   < 0) S.yEnd   = Math.min(2, raw.length-1);
  if(S.yStart > S.yEnd) S.yEnd = S.yStart;

  buildStrip(raw);

  // Animate y tiles
  setTimeout(() => {
    D.decompArea.querySelectorAll(".char-tile.ty").forEach((t,i) => {
      t.classList.remove("pump-anim");
      void t.offsetWidth;
      t.classList.add("pump-anim");
    });
  }, 50);

  renderBrackets();
  renderChips();
  updateCondBanner();
  renderPumping(S.pumpI, key);
  renderVerdict(key);
  renderProof(key);
  D.decompHint.innerHTML = `Drag tiles to adjust <strong>y</strong>`;
}

/* ════════════════════════════════════════════════════
   11. PUMPING
   ════════════════════════════════════════════════════ */
function renderPumping(selI, langKey) {
  const maxI = Math.max(selI, 4);
  D.tabRow.innerHTML = "";
  for(let i=0;i<=maxI;i++){
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i===selI?" active":"");
    btn.textContent = `i = ${i}`;
    btn.addEventListener("click", () => {
      S.pumpI = i;
      D.tabRow.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      renderPumpRows(i, langKey);
      updateCondBanner();
    });
    D.tabRow.appendChild(btn);
  }
  renderPumpRows(selI, langKey);
}

function renderPumpRows(hiI, langKey) {
  D.pumpList.innerHTML = "";
  const lang = LANGS.get(langKey);
  const isCustom = langKey==="custom";
  const maxI = Math.max(hiI, 4);

  for(let i=0;i<=maxI;i++){
    const pumped = S.xPart + S.yPart.repeat(i) + S.zPart;
    const inL = isCustom ? true : lang.inLanguage(pumped);
    const isHi = i===hiI;

    const row = document.createElement("div");
    row.className = "pump-row";
    row.style.animationDelay = `${i*32}ms`;
    if(!isHi) row.style.opacity = ".38";

    const lbl = document.createElement("div");
    lbl.className = "pump-lbl";
    lbl.textContent = `i=${i}`;

    const str = document.createElement("div");
    str.className = "pump-str";
    addChars(str, S.xPart, "px", false);
    addChars(str, S.yPart.repeat(i), "py", isHi && i>0);
    addChars(str, S.zPart, "pz", false);

    if(!pumped) {
      const eps = document.createElement("span");
      eps.style.cssText="font-family:var(--ff-mono);font-size:.8rem;color:var(--ink4);padding:4px 8px;font-style:italic";
      eps.textContent="ε";
      str.appendChild(eps);
    }

    const tag = document.createElement("div");
    tag.className = `pump-tag ${inL?"ok":"fail"}`;
    tag.textContent = inL ? "✔ In L" : "✘ Not in L";

    row.appendChild(lbl); row.appendChild(str); row.appendChild(tag);
    D.pumpList.appendChild(row);
  }
}

function addChars(container, str, cls, anim) {
  [...str].forEach((ch,i) => {
    const c = document.createElement("div");
    c.className = `pc ${cls}`;
    if(anim){ c.classList.add("str-anim"); c.style.animationDelay=`${i*42}ms`; }
    c.textContent = ch;
    container.appendChild(c);
  });
}

/* ════════════════════════════════════════════════════
   12. VERDICT
   ════════════════════════════════════════════════════ */
function renderVerdict(langKey) {
  const lang = LANGS.get(langKey);
  const isCustom = langKey==="custom";
  const {s,p,xPart:x,yPart:y,zPart:z,pumpI,xyLen,yLen} = S;

  const sInL = isCustom ? true : lang.inLanguage(s);
  const sOk  = s.length >= p;
  const yOk  = yLen  >= 1;
  const xyOk = xyLen <= p;

  let pumpsOut = [];
  if(!isCustom) {
    for(let k=0;k<=Math.max(pumpI,6);k++){
      const ps = x+y.repeat(k)+z;
      if(!lang.inLanguage(ps)) pumpsOut.push({k,ps});
    }
  }
  const allOk = pumpsOut.length===0;

  let vc, icon, head, body;

  if(isCustom){
    vc="v-warn"; icon="?"; head="Custom mode — no auto-check";
    body="Select a preset language for full automated analysis.";
  } else if(!sInL){
    vc="v-warn"; icon="⚠"; head=`"${s}" is not in ${lang.name}`;
    body=`The Pumping Lemma only applies to strings <em>in</em> the language. Choose a valid string from ${lang.name}.`;
  } else if(!sOk){
    vc="v-warn"; icon="⚠"; head="String is shorter than p";
    body=`|s|=${s.length} but p=${p}. The lemma needs |s| ≥ p. Increase p or use a longer string.`;
  } else if(!yOk){
    vc="v-warn"; icon="⚠"; head="Condition ① violated: |y| = 0";
    body="The y segment must be non-empty. Drag at least one character into the y (amber) selection.";
  } else if(!xyOk){
    vc="v-warn"; icon="⚠"; head="Condition ② violated: |xy| > p";
    body=`|xy|=${xyLen} exceeds p=${p}. Move the y selection earlier in the string.`;
  } else if(!allOk){
    const ex=pumpsOut[0];
    vc="v-fail"; icon="✘"; head="Pumping Condition Violated — Language NOT Regular";
    body=`For i=${ex.k}, xy<sup>${ex.k}</sup>z = <code>${ex.ps}</code> is <strong>not in ${lang.name}</strong>.
          Condition ③ fails → <strong>${lang.name} is NOT regular</strong>.`;
  } else {
    vc="v-ok"; icon="✔"; head="Pumping condition holds for this decomposition";
    body=lang.isRegular
      ? `For all tested i, xy<sup>i</sup>z stays in ${lang.name}. ✔ This IS a regular language.`
      : `No violation found here. Note: to prove ${lang.name} is irregular, ALL valid decompositions must violate the lemma.`;
  }

  D.verdictBox.innerHTML = `
    <div class="verdict-inner ${vc}">
      <div class="verdict-icon" aria-hidden="true">${icon}</div>
      <div class="verdict-body"><h3>${head}</h3><p>${body}</p></div>
    </div>`;
}

/* ════════════════════════════════════════════════════
   13. PROOF STEPS
   ════════════════════════════════════════════════════ */
function renderProof(langKey) {
  const lang = LANGS.get(langKey);
  const isCustom = langKey==="custom";
  const {s,p,xPart:x,yPart:y,zPart:z,pumpI,xyLen,yLen} = S;

  const sInL = isCustom?true:lang.inLanguage(s);
  const sOk  = s.length >= p;
  const yOk  = yLen>=1;
  const xyOk = xyLen<=p;

  let pumpsOut=[];
  if(!isCustom){
    for(let k=0;k<=Math.max(pumpI,6);k++){
      const ps=x+y.repeat(k)+z;
      if(!lang.inLanguage(ps))pumpsOut.push({k,ps});
    }
  }
  const allOk=pumpsOut.length===0;

  const steps=[
    { tag:"Assume",
      html:`Assume for contradiction that <em>${isCustom?"L":lang.name}</em> is regular.
            By the Pumping Lemma there exists pumping length <strong>p = ${p}</strong>.` },
    { tag:"Choose s",
      html:`Choose <code>${s}</code> (length <strong>${s.length}</strong>).
            ${!isCustom&&sInL?`<span class="ok-txt">✔ s ∈ ${lang.name}</span>`:""}
            ${!isCustom&&!sInL?`<span class="fail-txt">✘ s ∉ ${lang.name} — pick a valid string.</span>`:""}
            ${sOk?`<span class="ok-txt">✔ |s|=${s.length} ≥ p=${p}</span>`:`<span class="fail-txt">✘ |s|=${s.length} < p=${p}</span>`}` },
    { tag:"Decompose",
      html:`Write s = xyz: <code>x="${x||"ε"}"</code>, <code>y="${y||"ε"}"</code>, <code>z="${z||"ε"}"</code>.<br>
            ① |y|=${yLen} ≥ 1 <span class="${yOk?"ok-txt":"fail-txt"}">${yOk?"✔":"✘"}</span> &nbsp;
            ② |xy|=${xyLen} ≤ p=${p} <span class="${xyOk?"ok-txt":"fail-txt"}">${xyOk?"✔":"✘"}</span>` },
    { tag:"Pump",
      html:isCustom
        ? "③ Select a preset language to verify xy<sup>i</sup>z ∈ L for all i."
        : (!allOk
            ? `③ For <strong>i=${pumpsOut[0].k}</strong>, xy<sup>${pumpsOut[0].k}</sup>z =
               <code>${pumpsOut[0].ps}</code> <span class="fail-txt">∉ ${lang.name}</span>. Contradiction!`
            : `③ For all tested i (0–${Math.max(pumpI,6)}), xy<sup>i</sup>z
               <span class="ok-txt">∈ ${lang.name}</span>. No violation found.`) },
    { tag:"Conclude",
      html:isCustom     ? "Select a preset for a full conclusion."
          :!sInL        ? "Choose a valid string in L to proceed."
          :!sOk         ? "Use a longer string (|s| ≥ p) to proceed."
          :!yOk||!xyOk  ? "Fix the decomposition constraints to proceed."
          :!allOk       ? `<strong>${lang.name} is NOT regular</strong> — the Pumping Lemma is violated.`
          :lang.isRegular? `Consistent with ${lang.name} being regular. ✔`
                         : `No contradiction found here. Try other decompositions — all must fail to prove irregularity.` }
  ];

  D.proofSteps.innerHTML = steps.map((st,i)=>`
    <div class="proof-step" style="animation-delay:${i*50}ms">
      <span class="step-tag">${st.tag}</span>
      <span class="step-body">${st.html}</span>
    </div>`).join("");
}

/* ════════════════════════════════════════════════════
   14. RESET
   ════════════════════════════════════════════════════ */
function resetTool() {
  D.inputString.value=""; D.stringNote.textContent=""; D.stringNote.className="field-note";
  D.langBadge.style.display="none"; D.languageSelect.value="custom";
  D.pumpingLength.value="3"; D.pumpCount.value="2";
  syncSlider(D.pumpingLength,D.pLenVal); syncSlider(D.pumpCount,D.pCountVal);
  S.s=""; S.langKey="custom"; S.yStart=1; S.yEnd=2; S.p=3; S.pumpI=2;
  D.decompArea.innerHTML=`<p class="empty-msg"><span class="empty-dot">◌</span> Enter a string and click Demonstrate</p>`;
  D.bracketRow.innerHTML=""; D.chipRow.innerHTML=""; D.tabRow.innerHTML="";
  D.pumpList.innerHTML=`<p class="empty-msg"><span class="empty-dot">◌</span> Pumped strings will appear here</p>`;
  D.verdictBox.innerHTML=`<div class="verdict-placeholder"><span class="vp-star">✦</span><p>Run a demonstration to see the verdict</p></div>`;
  D.proofSteps.innerHTML="";
  D.decompHint.innerHTML=`Click characters below to select <strong>y</strong>`;
  [D.cond1,D.cond2,D.cond3].forEach(c=>c.classList.remove("c-ok","c-fail"));
  [D.tick1,D.tick2,D.tick3].forEach(t=>t.textContent="");
}

/* ════════════════════════════════════════════════════
   15. GUIDED TOUR
   ════════════════════════════════════════════════════ */
const TOUR = [
  { id:"wt-language", side:"right" },
  { id:"wt-params",   side:"right" },
  { id:"wt-theorem",  side:"bottom"},
  { id:"wt-decomp",   side:"bottom"},
  { id:"wt-pump",     side:"bottom"},
  { id:"wt-verdict",  side:"bottom"},
];

function startTour() {
  S.tourActive=true; S.tourStep=0;
  D.btnTour.setAttribute("aria-pressed","true");
  D.tourOverlay.classList.add("open");
  showTourStep(0);
}

function endTour() {
  S.tourActive=false;
  D.btnTour.setAttribute("aria-pressed","false");
  D.tourOverlay.classList.remove("open");
  D.tourOverlay.innerHTML="";
  document.querySelectorAll(".card.wt-hi,.theorem-bar.wt-hi,.sb-block.wt-hi").forEach(e=>e.classList.remove("wt-hi"));
}

function showTourStep(idx) {
  document.querySelectorAll(".wt-hi").forEach(e=>e.classList.remove("wt-hi"));
  if(idx>=TOUR.length){endTour();return;}

  const step   = TOUR[idx];
  const target = document.getElementById(step.id);
  if(!target){endTour();return;}
  target.classList.add("wt-hi");
  target.scrollIntoView({behavior:"smooth",block:"nearest"});

  const title = target.dataset.wtTitle||"";
  const body  = target.dataset.wtBody ||"";
  const total = TOUR.length;

  const rect = target.getBoundingClientRect();
  const sy   = window.scrollY||0;

  const tip = document.createElement("div");
  tip.className = `tour-tip ${step.side==="bottom"?"tip-arrow-t":"tip-arrow-b"}`;
  tip.innerHTML = `
    <h4>${title}</h4>
    <p>${body}</p>
    <div class="tour-nav">
      <span class="tour-prog">${idx+1} / ${total}</span>
      <div class="tour-btns">
        ${idx>0?`<button class="t-btn t-prev">← Prev</button>`:""}
        <button class="t-btn t-next">${idx<total-1?"Next →":"Finish"}</button>
        <button class="t-btn t-close">✕</button>
      </div>
    </div>`;

  // Position
  let top, left;
  if(step.side==="bottom"){ top=rect.bottom+sy+12; left=rect.left+window.scrollX; }
  else                    { top=rect.top+sy;        left=rect.right+window.scrollX+12; }
  left = Math.max(8, Math.min(left, window.innerWidth-308));
  tip.style.top=top+"px"; tip.style.left=left+"px";

  D.tourOverlay.innerHTML="";
  D.tourOverlay.appendChild(tip);

  tip.querySelector(".t-next")?.addEventListener("click",()=>showTourStep(idx+1));
  tip.querySelector(".t-prev")?.addEventListener("click",()=>showTourStep(idx-1));
  tip.querySelector(".t-close")?.addEventListener("click",endTour);
}

/* ════════════════════════════════════════════════════
   16. BOOT
   ════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  cacheDOM();

  // Sliders
  [[D.pumpingLength,D.pLenVal],[D.pumpCount,D.pCountVal]].forEach(([inp,badge])=>{
    syncSlider(inp,badge);
    inp.addEventListener("input",()=>syncSlider(inp,badge));
  });

  // Pages
  D.btnGetStarted.addEventListener("click", goToTool);
  D.btnBack.addEventListener("click", goToLanding);

  // Tour
  D.btnTour.addEventListener("click", ()=>{ S.tourActive ? endTour() : startTour(); });

  // Language
  D.languageSelect.addEventListener("change", onLangChange);
  D.inputString.addEventListener("input", validateString);

  // Demonstrate
  D.btnDemo.addEventListener("click", demonstrate);

  // End drag anywhere
  document.addEventListener("mouseup", ()=>{ if(S.isDragging) endDrag(); });

  // Initial y defaults
  S.yStart=1; S.yEnd=2;
});
