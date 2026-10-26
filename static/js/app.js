/* ==========================================================================
   app.js — shared helpers used by every page
   Loaded before per-page scripts by base.html
   ========================================================================== */

/**
 * Fetch wrapper.
 *  - Applies a timeout (AbortController).
 *  - Normalises errors into a small shape: { ok, status, data, error }.
 *  - Never throws — always resolves.
 */
async function apiFetch(path, options = {}) {
  const { method = "GET", body = null, timeoutMs = 8000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
  }

  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: "same-origin",
    });

    const text = await res.text();
    const data = text ? safeJson(text) : null;

    if (!res.ok) {
      return { ok: false, status: res.status, data, error: (data && data.error) || res.statusText };
    }
    return { ok: true, status: res.status, data, error: null };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, status: 0, data: null, error: "Request timed out" };
    }
    return { ok: false, status: 0, data: null, error: err.message || "Network error" };
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/** Format a number as South African Rand. */
function formatZAR(amount, { decimals = 2 } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "R —";
  return (
    "R " +
    n.toLocaleString("en-ZA", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/** Escape text before injecting into HTML (defence against stored XSS). */
function esc(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

/** Simple view helper: replace element text safely. */
function setText(selector, value) {
  const el = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (el) el.textContent = value ?? "";
}

/** Show a small toast (used for errors and confirmations). */
function toast(message, { type = "info", ms = 3000 } = {}) {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.style.cssText =
      "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
      "display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none;";
    document.body.appendChild(host);
  }
  const t = document.createElement("div");
  t.textContent = message;
  t.style.cssText =
    "pointer-events:auto;padding:10px 16px;border-radius:10px;font:500 14px/1.4 Inter,system-ui;" +
    "box-shadow:0 8px 24px rgba(15,42,32,.15);" +
    (type === "error"
      ? "background:#B23A48;color:#fff;"
      : type === "success"
      ? "background:#477A58;color:#fff;"
      : "background:#574260;color:#fff;");
  host.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/** Modal helper used by the eligibility confirmation popup. */
function openModal(html, { onConfirm, onCancel } = {}) {
  closeModal(); // ensure only one

  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(15,42,32,.45);" +
    "display:grid;place-items:center;padding:20px;z-index:1000;" +
    "backdrop-filter:blur(3px);";

  const box = document.createElement("div");
  box.style.cssText =
    "background:#fff;border-radius:16px;max-width:380px;width:100%;padding:24px;" +
    "box-shadow:0 24px 48px rgba(15,42,32,.25);";
  box.innerHTML = html;

  overlay.appendChild(box);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);

  overlay.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      closeModal();
      if (action === "confirm" && onConfirm) onConfirm();
      if (action === "cancel" && onCancel) onCancel();
    });
  });

  overlay._onKey = (e) => {
    if (e.key === "Escape") {
      closeModal();
      if (onCancel) onCancel();
    }
  };
  document.addEventListener("keydown", overlay._onKey);
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    if (overlay._onKey) document.removeEventListener("keydown", overlay._onKey);
    overlay.remove();
  }
}

function initializeTileDialogs() {
  const dialog = document.getElementById("tile-dialog");
  if (!dialog) return;

  const title = dialog.querySelector("#tile-dialog-title");
  const content = dialog.querySelector(".tile-dialog-content");
  const closeButton = dialog.querySelector(".tile-dialog-close");
  const tiles = document.querySelectorAll(".tile");
  let activeTile = null;

  function closeTileDialog() {
    if (dialog.open) dialog.close();
  }

  function openTileDialog(tile) {
    const tileTitle = tile.querySelector(".tile-title");
    if (!tileTitle) return;

    activeTile = tile;
    title.textContent = tileTitle.textContent.trim();
    content.replaceChildren(
      ...Array.from(tile.children)
        .filter((child) => !child.classList.contains("tile-title"))
        .map((child) => child.cloneNode(true))
    );
    tiles.forEach((item) => item.setAttribute("aria-expanded", String(item === tile)));
    dialog.showModal();
  }

  tiles.forEach((tile) => {
    tile.addEventListener("click", () => openTileDialog(tile));
    tile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTileDialog(tile);
      }
    });
  });

  closeButton.addEventListener("click", closeTileDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeTileDialog();
  });
  dialog.addEventListener("close", () => {
    tiles.forEach((tile) => tile.setAttribute("aria-expanded", "false"));
    if (activeTile) {
      activeTile.focus();
      activeTile = null;
    }
  });
}

initializeTileDialogs();

/* --------------------------------------------------------------- 
   Fallback demo data — used ONLY if the API request fails.
   Explicitly labelled in the UI as "offline demo".
   --------------------------------------------------------------- */
const DEMO_FALLBACK = {
  dashboard: {
    user: { name: "Thando", initials: "T", tier: 2 },
    funds: { total_available: 2450.0, own_funds: 2450.0 },
    credit: {
      limit: 1700,
      available: 1020,
      tier: 2,
      tier_label: "Tier 2 — Growing",
      basis: "Based on your income and account activity",
    },
    recent_activity: [
      { type: "payment", label: "Payment to Merchants", amount: -350.0, when: "Today, 10:24" },
      { type: "repayment", label: "Repayment", amount: -200.0, when: "Yesterday, 14:32" },
      { type: "savings", label: "Savings contribution", amount: -150.0, when: "12 Apr 2025" },
    ],
  },
  eligibility: {
    monthly_income: 8500,
    eligible: true,
    limit: 1700,
    tier: 2,
    tier_label: "Tier 2 — Growing",
    reason: "Based on your income and banking activity, you qualify for a credit limit of up to R1,700.",
    how_calculated: ["20% of verified monthly income", "Rounded to the nearest R100", "Capped at R25,000 in the sandbox"],
  },
  insights: [
    {
      month: "October 2026",
      title: "You're on track for Tier 3",
      body: "Two more on-time repayments and consistent savings will unlock the next tier.",
      cta: "See how it's calculated",
    },
    {
      month: "October 2026",
      title: "Set a small savings goal",
      body: "A R1,000 emergency fund is the single biggest signal of financial stability.",
      cta: "Create a goal",
    },
  ],
  report: {
    period: "October 2026",
    summary:
      "You had a steady month. Payments were on time, you saved every month, and your available credit stayed healthy.",
    metrics: [
      { label: "On-time repayments", value: "4 / 4", status: "good" },
      { label: "Savings contributions", value: "R 150 / month", status: "good" },
      { label: "Credit utilisation", value: "40%", status: "warn" },
      { label: "Account tenure", value: "3 months", status: "good" },
    ],
    next_steps: [
      { title: "Lower utilisation to 30%", body: "Try keeping spend under 30% of your limit for the next cycle." },
      { title: "Keep your savings streak alive", body: "Another two months of R150 contributions will upgrade your savings tier." },
      { title: "Progress toward Tier 3", body: "Consistency is the single biggest driver. No missed payments for 90 days." },
    ],
    disclaimer:
      "Indicative only. This is a simulated monthly summary generated from sandbox data — it is not a credit bureau report and does not represent a credit offer.",
  },
};

/* Expose for page scripts */
window.Pace = {
  apiFetch,
  formatZAR,
  esc,
  setText,
  toast,
  openModal,
  closeModal,
  DEMO_FALLBACK,
};