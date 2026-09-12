/**
 * The Ethical Phish — ENVISION 2026 Quishing Research Framework
 * Consent-based QR-phishing susceptibility simulation.
 *
 * ETHICAL DESIGN NOTES (read before deploying):
 * - Only ever share the /sandbox/:condition links with people who have
 *   already given Stage-1 informed consent (see paper §5.2 / research-consent-form.md).
 * - No submitted field VALUES are ever stored — only the fact that a
 *   submit event occurred, with a timestamp and time-to-decision.
 * - Every submit immediately routes to /debrief, which cannot be skipped.
 * - Landing pages are generic mockups. They do not clone any real
 *   institution's actual login page or use any real logos/branding.
 */

const express = require("express");
const path = require("path");
const QRCode = require("qrcode");
const Database = require("better-sqlite3");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Render/Railway expose your service at a public URL; set BASE_URL there
// (e.g. https://your-app.onrender.com) so QR codes point somewhere reachable.
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Database ----------
const db = new Database(path.join(__dirname, "events.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    action TEXT NOT NULL,
    time_to_decision REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertEvent = db.prepare(`
  INSERT INTO events (participant_id, condition_id, action, time_to_decision)
  VALUES (@participantId, @condition, @action, @timeToDecision)
`);

// ---------- Helpers ----------
function conditionLabel(c) {
  return c === "B" ? "Incentive-Framed" : "Plain Design";
}

function pageShell({ title, bodyClass = "", content, showFooterNote = true }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { --navy:#1F3864; --navy-dark:#14213D; --gold:#C9A227; --gold-light:#E4C55A; --light:#F6F4EC; --grey:#5B6472; --line:#EAEAEA; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:'Inter', -apple-system, Segoe UI, Arial, sans-serif; background: radial-gradient(circle at top, #2a4677 0%, #0f1a30 65%); min-height:100vh; color:#222; }
  .wrap { max-width: 460px; margin: 0 auto; min-height:100vh; background:#fff; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
  .topbar { background: linear-gradient(135deg, var(--navy), var(--navy-dark)); color:#fff; padding:20px 26px; display:flex; align-items:center; gap:11px; }
  .topbar .mark { width:26px; height:26px; border-radius:8px; background: linear-gradient(135deg, var(--gold-light), var(--gold)); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; color:var(--navy-dark); }
  .topbar span { font-weight:600; letter-spacing:0.4px; font-size:14px; }
  .content { padding: 32px 26px; }
  h1 { font-size:21px; margin:0 0 7px; color:var(--navy-dark); font-weight:700; letter-spacing:-0.2px; }
  p.sub { color:var(--grey); margin:0 0 24px; font-size:14px; line-height:1.5; }
  label { display:block; font-size:12.5px; font-weight:600; color:var(--navy-dark); margin:16px 0 6px; letter-spacing:0.2px; }
  input { width:100%; padding:13px 15px; border:1.5px solid #e2e2e2; border-radius:10px; font-size:15px; font-family:inherit; transition: border-color 0.15s, box-shadow 0.15s; }
  input:focus { outline:none; border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,162,39,0.15); }
  button.submit { margin-top:24px; width:100%; padding:14px; background: linear-gradient(135deg, var(--navy), var(--navy-dark)); color:#fff; border:none; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; letter-spacing:0.2px; transition: transform 0.1s, box-shadow 0.15s; box-shadow:0 4px 14px rgba(31,56,100,0.3); }
  button.submit:hover { transform: translateY(-1px); box-shadow:0 6px 18px rgba(31,56,100,0.4); }
  .badge { display:inline-block; background: linear-gradient(135deg, var(--gold-light), var(--gold)); color:var(--navy-dark); font-size:11px; font-weight:700; padding:5px 12px; border-radius:20px; margin-bottom:16px; letter-spacing:0.4px; }
  .footnote { margin-top: 28px; padding-top:18px; border-top:1px solid var(--line); font-size:11px; color:#aaa; text-align:center; letter-spacing:0.2px; }
  .voucher-box { background: linear-gradient(135deg, var(--navy), var(--navy-dark)); color:#fff; border-radius:12px; padding:20px 22px; margin-bottom:22px; position:relative; overflow:hidden; }
  .voucher-box::after { content:""; position:absolute; top:-30%; right:-15%; width:120px; height:120px; border-radius:50%; background:radial-gradient(circle, rgba(201,162,39,0.25), transparent 70%); }
  .voucher-box .amt { font-size:30px; font-weight:800; color:var(--gold-light); position:relative; }
  .voucher-box .exp { font-size:12px; opacity:0.85; margin-top:5px; position:relative; }
</style>
</head>
<body>
  <div class="wrap ${bodyClass}">
    <div class="topbar"><div class="mark">TE</div><span>CAMPUS PORTAL</span></div>
    <div class="content">
      ${content}
      ${showFooterNote ? `<div class="footnote">Research Simulation Environment &middot; The Ethical Phish &middot; Not a production system</div>` : ""}
    </div>
  </div>
</body>
</html>`;
}

// ---------- Routes: Home / presenter console ----------
app.get("/", (req, res) => {
  res.send(pageShell({
    title: "The Ethical Phish — Presenter Console",
    showFooterNote: false,
    content: `
      <span class="badge">PRESENTER CONSOLE</span>
      <h1>The Ethical Phish</h1>
      <p class="sub">ENVISION 2026 &middot; Live demo &amp; data collection control panel</p>
      <label>Generate QR codes</label>
      <p style="font-size:14px; margin-bottom:10px;">
        <a href="/generate-qr?condition=A" style="color:var(--navy); font-weight:600;">Condition A — Plain (Password Reset)</a><br><br>
        <a href="/generate-qr?condition=B" style="color:var(--navy); font-weight:600;">Condition B — Incentive (Exam Voucher)</a>
      </p>
      <label>Live dashboard</label>
      <p style="font-size:14px;"><a href="/dashboard" style="color:var(--navy); font-weight:600;">Open live dashboard →</a></p>
      <label>Direct links (for testing without a QR scan)</label>
      <p style="font-size:13px; color:#666;">
        Consent → Condition A: ${BASE_URL}/consent?condition=A<br>
        Consent → Condition B: ${BASE_URL}/consent?condition=B
      </p>
    `,
  }));
});

// ---------- Routes: QR generation ----------
app.get("/generate-qr", async (req, res) => {
  const condition = (req.query.condition || "A").toUpperCase() === "B" ? "B" : "A";
  const targetUrl = `${BASE_URL}/consent?condition=${condition}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 400, margin: 2, color: { dark: "#1F3864", light: "#FFFFFF" } });
    res.send(pageShell({
      title: `QR Code — Condition ${condition}`,
      showFooterNote: false,
      content: `
        <span class="badge">CONDITION ${condition} &middot; ${conditionLabel(condition).toUpperCase()}</span>
        <h1>Scan to open the simulated page</h1>
        <p class="sub">Project this page, or open the image directly, for a live scan.</p>
        <div style="text-align:center; padding:20px; background:#fafafa; border-radius:12px;">
          <img src="${qrDataUrl}" alt="QR code" style="width:100%; max-width:320px;">
        </div>
        <p style="font-size:12px; color:#888; word-break:break-all; margin-top:14px;">${targetUrl}</p>
      `,
    }));
  } catch (err) {
    res.status(500).send("Failed to generate QR code: " + err.message);
  }
});

// ---------- Routes: Digital consent gate ----------
// Every QR code now leads here FIRST. No one reaches the simulated sandbox
// page without explicitly agreeing on this screen.
app.get("/consent", (req, res) => {
  const condition = (req.query.condition || "A").toUpperCase() === "B" ? "B" : "A";
  const participantId = randomUUID();

  res.send(pageShell({
    title: "Research Consent — The Ethical Phish",
    content: `
      <span class="badge">BEFORE YOU CONTINUE</span>
      <h1>This is a research simulation.</h1>
      <p class="sub">You're about to take part in a short study on QR-code phishing awareness, run as part of the ENVISION 2026 research project, <em>The Ethical Phish</em>.</p>
      <div style="background:var(--light); border-radius:12px; padding:18px 20px; margin-bottom:20px; font-size:13.5px; color:#444; line-height:1.6;">
        <ul style="padding-left:18px; margin:0;">
          <li>You'll be shown a page designed to look like a real phishing attempt.</li>
          <li>Nothing you type on the next page is ever read, transmitted, or stored — only whether you submitted, and how long it took, is logged.</li>
          <li>You're represented only by a random, anonymous ID — never your name.</li>
          <li>Right after, you'll see a full debrief explaining what happened.</li>
          <li>You can stop at any time. Declining or closing this page has no consequences.</li>
        </ul>
      </div>
      <button class="submit" id="agreeBtn" style="margin-top:4px;">I Agree — Continue</button>
      <button id="declineBtn" style="margin-top:12px; width:100%; padding:13px; background:#fff; color:var(--grey); border:1.5px solid #e2e2e2; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer;">I Don't Consent</button>
      <div id="declineMsg" style="display:none; margin-top:18px; text-align:center; font-size:13px; color:var(--grey);">That's completely fine — you can close this page now. Thank you for considering it.</div>
    `,
  }) + `
  <script>
    const participantId = ${JSON.stringify(participantId)};
    const condition = ${JSON.stringify(condition)};

    fetch("/log-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, condition, action: "consent_viewed", timeToDecision: 0 })
    }).catch(() => {});

    document.getElementById("agreeBtn").addEventListener("click", function () {
      fetch("/log-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, condition, action: "consent_agreed", timeToDecision: 0 })
      }).finally(() => {
        window.location.href = "/sandbox/" + condition + "?pid=" + encodeURIComponent(participantId);
      });
    });

    document.getElementById("declineBtn").addEventListener("click", function () {
      fetch("/log-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, condition, action: "consent_declined", timeToDecision: 0 })
      }).catch(() => {});
      document.getElementById("agreeBtn").style.display = "none";
      document.getElementById("declineBtn").style.display = "none";
      document.getElementById("declineMsg").style.display = "block";
    });
  </script>
  `);
});

// ---------- Routes: Sandbox landing pages ----------
app.get("/sandbox/:condition", (req, res) => {
  const condition = req.params.condition.toUpperCase() === "B" ? "B" : "A";
  // If arriving from /consent, keep the same anonymous ID so the full
  // consent → view → submit journey is traceable to one participant.
  // Otherwise (e.g. direct testing) generate a fresh one.
  const participantId = typeof req.query.pid === "string" && req.query.pid.length > 0
    ? req.query.pid
    : randomUUID();

  const formContent = condition === "B" ? `
      <span class="badge">LIMITED TIME</span>
      <h1>Claim Your Exam-Season Voucher</h1>
      <p class="sub">Enrolled students get a free stationery pack this exam season — claim yours below.</p>
      <div class="voucher-box">
        <div class="amt">AED 50 Voucher</div>
        <div class="exp">Offer expires at the end of exam week</div>
      </div>
      <form id="quishForm">
        <label>Full Name</label>
        <input type="text" placeholder="e.g. Aisha Khan" required>
        <label>Student Email</label>
        <input type="email" placeholder="e.g. student@campusmail.edu" required>
        <label>Student ID</label>
        <input type="text" placeholder="e.g. ND2026-1234" required>
        <button type="submit" class="submit">Claim Voucher</button>
      </form>
  ` : `
      <h1>Student Services — Password Reset</h1>
      <p class="sub">Enter your details to continue resetting your student portal password.</p>
      <form id="quishForm">
        <label>Student ID</label>
        <input type="text" placeholder="e.g. ND2026-1234" required>
        <label>Current Password</label>
        <input type="password" placeholder="••••••••" required>
        <button type="submit" class="submit">Continue</button>
      </form>
  `;

  res.send(pageShell({
    title: condition === "B" ? "Claim Your Exam Voucher" : "Student Services — Password Reset",
    content: formContent,
  }) + `
  <script>
    const participantId = ${JSON.stringify(participantId)};
    const condition = ${JSON.stringify(condition)};
    const startTime = Date.now();

    // Log the "viewed" event immediately on page load.
    // NOTE: no form field values are ever read or transmitted here or on submit.
    fetch("/log-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, condition, action: "viewed", timeToDecision: 0 })
    }).catch(() => {});

    document.getElementById("quishForm").addEventListener("submit", function (e) {
      e.preventDefault(); // form values are intentionally never read or sent anywhere
      const timeToDecision = (Date.now() - startTime) / 1000;
      fetch("/log-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, condition, action: "submitted", timeToDecision })
      }).finally(() => {
        window.location.href = "/debrief?condition=" + condition + "&t=" + timeToDecision.toFixed(1);
      });
    });
  </script>
  `);
});

// ---------- Routes: Event logging ----------
app.post("/log-event", (req, res) => {
  const { participantId, condition, action, timeToDecision } = req.body || {};
  if (!participantId || !condition || !action) {
    return res.status(400).json({ error: "participantId, condition, and action are required" });
  }
  insertEvent.run({
    participantId: String(participantId),
    condition: String(condition).toUpperCase() === "B" ? "B" : "A",
    action: String(action),
    timeToDecision: typeof timeToDecision === "number" ? timeToDecision : null,
  });
  res.json({ ok: true });
});

// ---------- Routes: Debrief ----------
app.get("/debrief", (req, res) => {
  const condition = (req.query.condition || "A").toUpperCase() === "B" ? "B" : "A";
  const t = req.query.t ? `${req.query.t}s` : "—";
  res.send(pageShell({
    title: "You just took part in a research simulation",
    content: `
      <span class="badge" style="background:#2e7d32;">DEBRIEF</span>
      <h1>This was a simulated phishing page.</h1>
      <p class="sub">Nothing you typed was read, stored, or sent anywhere. Only the fact that you submitted, and how long it took you (${t}), was logged for the ENVISION 2026 study on QR code phishing.</p>
      <div style="background:var(--light); border-radius:10px; padding:16px 18px; margin-top:10px;">
        <strong style="font-size:13px; color:var(--navy-dark);">What gave it away?</strong>
        <ul style="font-size:13px; color:#444; padding-left:18px; margin:10px 0 0;">
          <li>The QR code's destination couldn't be verified before you scanned it.</li>
          <li>${condition === "B" ? "The urgency and free-voucher framing was designed to bypass careful thought." : "A generic \"reset your password\" prompt is a classic pretext used in real attacks."}</li>
          <li>A legitimate service will never ask you to re-enter a password by scanning a QR code.</li>
        </ul>
      </div>
      <div style="margin-top:18px; font-size:13px; color:#444;">
        <strong>Next time:</strong> before scanning any QR code in public, ask who placed it there, and never enter credentials on a page you reached by scanning rather than typing a known address yourself.
      </div>
    `,
  }));
});

// ---------- Routes: Stats API ----------
app.get("/api/stats", (req, res) => {
  const totals = db.prepare(`SELECT COUNT(DISTINCT participant_id) AS total FROM events`).get();

  const byCondition = {};
  for (const c of ["A", "B"]) {
    const consentViews = db.prepare(`SELECT COUNT(DISTINCT participant_id) AS n FROM events WHERE condition_id = ? AND action = 'consent_viewed'`).get(c).n;
    const consented = db.prepare(`SELECT COUNT(DISTINCT participant_id) AS n FROM events WHERE condition_id = ? AND action = 'consent_agreed'`).get(c).n;
    const declined = db.prepare(`SELECT COUNT(DISTINCT participant_id) AS n FROM events WHERE condition_id = ? AND action = 'consent_declined'`).get(c).n;
    const views = db.prepare(`SELECT COUNT(DISTINCT participant_id) AS n FROM events WHERE condition_id = ? AND action = 'viewed'`).get(c).n;
    const submits = db.prepare(`SELECT COUNT(DISTINCT participant_id) AS n FROM events WHERE condition_id = ? AND action = 'submitted'`).get(c).n;
    const avgTime = db.prepare(`SELECT AVG(time_to_decision) AS a FROM events WHERE condition_id = ? AND action = 'submitted'`).get(c).a;
    byCondition[c] = {
      consentViews,
      consented,
      declined,
      consentRate: consentViews > 0 ? Math.round((consented / consentViews) * 1000) / 10 : 0,
      views,
      submits,
      disclosureRate: views > 0 ? Math.round((submits / views) * 1000) / 10 : 0,
      avgTimeToDecision: avgTime ? Math.round(avgTime * 10) / 10 : null,
    };
  }

  const recent = db.prepare(`
    SELECT participant_id, condition_id, action, time_to_decision, created_at
    FROM events ORDER BY id DESC LIMIT 15
  `).all();

  res.json({ total: totals.total, byCondition, recent });
});

// Reset endpoint — handy for clearing test data before the real pilot / before a fresh demo
app.post("/api/reset", (req, res) => {
  db.exec(`DELETE FROM events;`);
  res.json({ ok: true });
});

// ---------- Routes: Dashboard ----------
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.listen(PORT, () => {
  console.log(`\n  The Ethical Phish — research framework running`);
  console.log(`  Local:      http://localhost:${PORT}`);
  console.log(`  Dashboard:  http://localhost:${PORT}/dashboard`);
  console.log(`  QR (A):     http://localhost:${PORT}/generate-qr?condition=A`);
  console.log(`  QR (B):     http://localhost:${PORT}/generate-qr?condition=B\n`);
});
