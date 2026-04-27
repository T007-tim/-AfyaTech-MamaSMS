/* Vanilla JS interactive demo for localized, SMS-friendly maternal guidance. */

const STORAGE_KEY = "afyatech_mamasms_v1";

const el = (id) => document.getElementById(id);
const $$ = (root, selector) => Array.from(root.querySelectorAll(selector));

function clampQuestions(questions, max = 2) {
  return questions.filter(Boolean).slice(0, max);
}

function normalizeText(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getCheckedValues(groupEl) {
  return $$(groupEl, "input[type='checkbox']:checked").map((i) => i.value);
}

function setCheckedValues(groupEl, values) {
  const set = new Set(values || []);
  $$(groupEl, "input[type='checkbox']").forEach((i) => {
    i.checked = set.has(i.value);
  });
}

function splitIntoSmsSegments(text, maxLen = 320) {
  const clean = (text || "").trim().replace(/[ \t]+\n/g, "\n");
  if (!clean) return [];

  const segments = [];
  let remaining = clean;
  while (remaining.length > maxLen) {
    // Prefer breaking on newline, then sentence, then space.
    const window = remaining.slice(0, maxLen + 1);
    const breakCandidates = [
      window.lastIndexOf("\n"),
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf("; "),
      window.lastIndexOf(", "),
      window.lastIndexOf(" "),
    ].filter((n) => n >= Math.floor(maxLen * 0.55));

    const cutAt = breakCandidates.length ? breakCandidates[0] + 1 : maxLen;
    const part = remaining.slice(0, cutAt).trim();
    if (part) segments.push(part);
    remaining = remaining.slice(cutAt).trim();
  }
  if (remaining) segments.push(remaining);
  return segments;
}

function detectDangerSignsFromText(userText) {
  const t = normalizeText(userText);
  const hits = new Set();

  const map = [
    ["bleeding", /\b(bleed|bleeding|blood)\b/],
    ["headache", /\b(severe headache|bad headache|headache)\b/],
    ["vision", /\b(blurred vision|cant see well|vision)\b/],
    ["swelling", /\b(swollen face|swollen hands|swelling)\b/],
    ["fits", /\b(fits|seizure|convulsion|faint)\b/],
    ["fever", /\b(fever|hot body|high temperature)\b/],
    ["pain", /\b(severe pain|severe abdominal|bad stomach pain|abdomen pain)\b/],
    ["waters", /\b(water broke|waters broke|water is coming|liquid leaking)\b/],
    ["movement", /\b(no movement|reduced movement|baby not moving|less movement)\b/],
    ["breathing", /\b(trouble breathing|cant breathe|short of breath)\b/],
  ];

  for (const [key, rx] of map) if (rx.test(t)) hits.add(key);
  return Array.from(hits);
}

function buildFoodLine(ctx) {
  const staples = new Set(ctx.staples);
  const parts = [];

  const starch =
    staples.has("matooke")
      ? "matooke"
      : staples.has("ugali_posho")
        ? "ugali/posho"
        : "a filling staple (ugali/posho or matooke)";

  const protein =
    staples.has("beans")
      ? "beans/ndengu"
      : staples.has("groundnuts")
        ? "groundnuts"
        : staples.has("small_fish")
          ? "omena/mukene (small fish)"
          : staples.has("eggs")
            ? "eggs (if acceptable)"
            : "beans or groundnuts";

  const greens = staples.has("greens") ? "sukuma/greens" : "greens/vegetables";
  const addOn = staples.has("porridge") ? "porridge" : null;
  const fruit = staples.has("bananas") ? "bananas" : "fruit when available";

  parts.push(`${starch} + ${protein} + ${greens}`);
  if (addOn) parts.push(addOn);
  parts.push(fruit);

  return `Food: try ${parts.join("; ")}.`;
}

function buildAccessLine(ctx) {
  if (ctx.access === "chv_near") {
    return "Care: talk to a CHV/CHW/VHT for quick check + help planning your next clinic visit.";
  }
  if (ctx.access === "clinic_far") {
    return "Care: if the clinic is far, plan one ANC day (go early) and ask a CHV/CHW/VHT or family member to help with travel.";
  }
  if (ctx.access === "clinic_near") {
    return "Care: if you can, go for ANC/clinic check soon (this week) and share your symptoms.";
  }
  return "Care: if possible, connect with a CHV/CHW/VHT or plan your next ANC/clinic day.";
}

function buildMoneyLine(ctx) {
  if (ctx.country === "kenya" && ctx.money === "mpesa") {
    return "Money: if transport is hard, save small amounts on M-Pesa for fare and go with someone you trust.";
  }
  if (ctx.money === "tight") {
    return "Money: focus on low-cost foods (beans, greens, porridge) and plan transport early with a CHV/CHW/VHT or family support.";
  }
  if (ctx.country === "kenya") {
    return "Money: if you can use M-Pesa, saving small amounts for transport can help you reach ANC on your chosen day.";
  }
  return "";
}

function localizedHints(ctx) {
  if (ctx.language === "en-sw") {
    return {
      sorry: "Pole",
      now: "sasa",
      please: "tafadhali",
      goNow: "Nenda sasa",
    };
  }
  if (ctx.language === "en-lg") {
    return {
      sorry: "Nsaba",
      now: "kati kati",
      please: "nsaba",
      goNow: "Genda kati kati",
    };
  }
  return { sorry: "Sorry", now: "now", please: "please", goNow: "Please go now" };
}

function buildQuestions(ctx, userText, dangerDetected) {
  const t = normalizeText(userText);
  const qs = [];

  if (ctx.country === "unknown") qs.push("Are you in Kenya or Uganda?");
  if (ctx.stage === "unknown") qs.push("How many months/weeks pregnant are you?");

  if (!dangerDetected) {
    if (/\b(headache|swollen|swelling|blurred)\b/.test(t)) {
      qs.push("Any blurred vision, severe headache, or swelling of face/hands?");
    } else if (/\b(pain|cramp|stomach)\b/.test(t)) {
      qs.push("Is the pain severe, with fever, or with bleeding?");
    } else if (t.length < 8) {
      qs.push("What symptoms are you feeling today?");
    }
  } else {
    qs.push("Can someone take you to the nearest facility now?");
  }

  if (ctx.access === "unknown") qs.push("Is a CHV/CHW/VHT nearby, or is the clinic far?");
  return clampQuestions(qs, 2);
}

function buildReply(ctx, userText, flagsFromUi) {
  const hints = localizedHints(ctx);

  const detectedFromText = detectDangerSignsFromText(userText);
  const danger = new Set([...(flagsFromUi || []), ...detectedFromText]);

  const hasDanger = danger.size > 0;

  const intro = hasDanger
    ? `${hints.sorry}—this could be serious in pregnancy. ${hints.goNow}.`
    : `${hints.sorry} you’re going through this. Here’s a safe next step.`;

  const actions = [];

  if (hasDanger) {
    actions.push("Go to the nearest health facility today. Do not wait.");
    actions.push("Ask a CHV/CHW/VHT or a family member to help you travel and be seen quickly.");
    actions.push("If bleeding is heavy, you faint, have fits, or struggle to breathe: treat it as an emergency.");
  } else {
    actions.push(buildFoodLine(ctx));
    actions.push("Drink water often. Rest when you can.");
    actions.push(buildAccessLine(ctx));
    const moneyLine = buildMoneyLine(ctx);
    if (moneyLine) actions.push(moneyLine);
    actions.push("If you get heavy bleeding, fever, severe headache, blurred vision, swollen face/hands, waters break early, or baby movement reduces: go urgently.");
  }

  const questions = buildQuestions(ctx, userText, hasDanger);

  const lines = [
    intro,
    "",
    ...actions.map((a) => `- ${a}`),
    questions.length ? "" : null,
    ...questions.map((q) => q),
  ].filter(Boolean);

  return {
    text: lines.join("\n"),
    hasDanger,
    detectedDanger: Array.from(danger),
  };
}

function renderSegments(segments) {
  const container = el("segments");
  container.innerHTML = "";
  if (!segments.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Generate a reply to see SMS segments here.";
    container.appendChild(empty);
    return;
  }

  segments.forEach((s, idx) => {
    const card = document.createElement("div");
    card.className = "segment";

    const top = document.createElement("div");
    top.className = "segment__top";

    const title = document.createElement("div");
    title.className = "segment__title";
    title.textContent = `SMS ${idx + 1}`;

    const count = document.createElement("div");
    count.className = "segment__count";
    count.textContent = `${s.length} chars`;

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn btn--ghost";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(s);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 850);
    });

    top.appendChild(title);
    top.appendChild(count);
    top.appendChild(copyBtn);

    const body = document.createElement("div");
    body.className = "segment__text";
    body.textContent = s;

    card.appendChild(top);
    card.appendChild(body);
    container.appendChild(card);
  });
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readCtxFromUi() {
  const staplesEl = el("staples");
  const ctx = {
    country: el("country").value,
    language: el("language").value,
    stage: el("stage").value,
    access: el("access").value,
    money: el("money").value,
    staples: getCheckedValues(staplesEl),
    cultural: el("cultural").value.trim(),
  };
  return ctx;
}

function writeCtxToUi(ctx) {
  if (!ctx) return;
  el("country").value = ctx.country || "unknown";
  el("language").value = ctx.language || "en";
  el("stage").value = ctx.stage || "unknown";
  el("access").value = ctx.access || "unknown";
  el("money").value = ctx.money || "unknown";
  setCheckedValues(el("staples"), ctx.staples || []);
  el("cultural").value = ctx.cultural || "";
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function init() {
  const staplesEl = el("staples");
  const flagsEl = el("flags");

  const userMsgEl = el("userMsg");
  const userCountEl = el("userCount");
  const replyCountEl = el("replyCount");

  const pillSafety = el("pillSafety");
  const pillSegments = el("pillSegments");

  const btnCopyAll = el("btnCopyAll");
  const btnExport = el("btnExport");

  let lastReplyText = "";
  let lastSegments = [];

  function syncCounts() {
    userCountEl.textContent = `${(userMsgEl.value || "").length} chars`;
  }

  function setPills(hasDanger, segmentsCount) {
    pillSafety.textContent = hasDanger ? "Safety: urgent" : "Safety: routine";
    pillSafety.style.borderColor = hasDanger ? "rgba(251,113,133,.45)" : "rgba(52,211,153,.35)";
    pillSafety.style.background = hasDanger ? "rgba(251,113,133,.10)" : "rgba(52,211,153,.08)";

    pillSegments.textContent = `Segments: ${segmentsCount}`;
  }

  function setOutputText(text, hasDanger) {
    lastReplyText = text;
    lastSegments = splitIntoSmsSegments(text, 320);

    renderSegments(lastSegments);
    replyCountEl.textContent = `${text.length} chars`;
    setPills(hasDanger, lastSegments.length);

    btnCopyAll.disabled = lastSegments.length === 0;
    btnExport.disabled = lastSegments.length === 0;
  }

  function buildStatePayload() {
    return {
      ctx: readCtxFromUi(),
      userMsg: userMsgEl.value,
      flags: getCheckedValues(flagsEl),
      lastReplyText,
    };
  }

  function restoreFromState(state) {
    if (!state) return;
    writeCtxToUi(state.ctx);
    userMsgEl.value = state.userMsg || "";
    setCheckedValues(flagsEl, state.flags || []);
    syncCounts();
    if (state.lastReplyText) {
      const hasDanger = (state.flags || []).length > 0;
      setOutputText(state.lastReplyText, hasDanger);
    }
  }

  // Live counts
  userMsgEl.addEventListener("input", syncCounts);

  // Buttons
  el("btnExample").addEventListener("click", () => {
    const scenario = el("scenario")?.value || "ex_swollen";
    const presets = {
      ex_swollen: {
        msg: "I am 7 months pregnant and my face is swollen and I have a bad headache.",
        ctx: { stage: "t3" },
      },
      ex_nausea: {
        msg: "I am 3 months pregnant and I feel nauseous in the morning.",
        ctx: { stage: "t1" },
      },
      ex_no_money: {
        msg: "I missed ANC because I had no transport money.",
        ctx: { money: "tight", access: "clinic_far" },
      },
      ex_food_taboo: {
        msg: "My mother-in-law says I should not eat eggs while pregnant. What can I eat?",
        ctx: { cultural: "Avoids eggs (family advice)" },
      },
      ex_movement: {
        msg: "I am 8 months pregnant and the baby is moving less today.",
        ctx: { stage: "t3" },
      },
    };

    const preset = presets[scenario] || presets.ex_swollen;
    userMsgEl.value = preset.msg;
    syncCounts();
    if (preset.ctx) {
      const merged = { ...readCtxFromUi(), ...preset.ctx };
      writeCtxToUi(merged);
    }
    const detected = detectDangerSignsFromText(userMsgEl.value);
    setCheckedValues(flagsEl, detected);
  });

  el("btnClearFlags").addEventListener("click", () => {
    setCheckedValues(flagsEl, []);
  });

  el("btnGenerate").addEventListener("click", () => {
    const ctx = readCtxFromUi();
    const flags = getCheckedValues(flagsEl);
    const userText = userMsgEl.value.trim();
    if (!userText) {
      setOutputText("Please type the incoming SMS first.", false);
      return;
    }

    const reply = buildReply(ctx, userText, flags);
    setOutputText(reply.text, reply.hasDanger);
  });

  btnCopyAll.addEventListener("click", async () => {
    if (!lastSegments.length) return;
    const joined = lastSegments.join("\n\n---\n\n");
    await navigator.clipboard.writeText(joined);
    btnCopyAll.textContent = "Copied";
    setTimeout(() => (btnCopyAll.textContent = "Copy all"), 900);
  });

  btnExport.addEventListener("click", () => {
    if (!lastSegments.length) return;
    const payload = [
      "AfyaTech MamaSMS export",
      "",
      ...lastSegments.map((s, i) => `SMS ${i + 1} (${s.length} chars)\n${s}`),
      "",
    ].join("\n\n");
    downloadText("mamasms-reply.txt", payload);
  });

  el("btnSave").addEventListener("click", () => {
    saveState(buildStatePayload());
    el("btnSave").textContent = "Saved";
    setTimeout(() => (el("btnSave").textContent = "Save"), 900);
  });

  el("btnReset").addEventListener("click", () => {
    clearState();
    window.location.reload();
  });

  // Restore saved state
  const saved = loadState();
  restoreFromState(saved);
  syncCounts();
  setPills(false, 0);
}

document.addEventListener("DOMContentLoaded", init);

