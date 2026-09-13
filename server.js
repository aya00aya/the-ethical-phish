/**
 * The Ethical Phish — ENVISION 2026 Quishing Research Framework
 * Consent-based QR-phishing susceptibility simulation.
 *
 * Uses a plain JSON file for storage — no native compilation needed.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const DATA_FILE = path.join(__dirname, "events.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Simple JSON storage ----------
function readEvents() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}
function writeEvents(events) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}
function insertEvent(ev) {
  const events = readEvents();
  events.push({
    ...ev,
    id: events.length + 1,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  });
  writeEvents(events);
}

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
<style>
  :root { --navy:#1F3864; --navy-dark:#14213D; --gold:#C9A227; --gold-light:#E4C55A; --light:#F6F4EC; --grey:#5B6472; --line:#EAEAEA; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system, Segoe UI, Arial, sans-serif; background: radial-gradient(circle at top, #2a4677 0%, #0f1a30 65%); min-height:100vh; color:#222; }
  .wrap { max-width: 460px; margin: 0 auto; min-height:100vh; background:#fff; box-shadow:0 20px 60px rgba(0,0,0,0.35); }
  .topbar { background: linear-gradient(135deg, var(--navy), var(--navy-dark)); color:#fff; padding:20px 26px; display:flex; align-items:center; gap:11px; }
  .topbar .mark { width:26px; height:26px; border-radius:8px; background: linear-gradient(135deg, var(--gold-light), var(--gold)); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; color:var(--navy-dark); }
  .topbar span { font-weight:600; letter-spacing:0.4px; font-size:14px; }
  .content { padding: 32px 26px; }
  h1 { font-size:21px; margin:0 0 7px; color:var(--navy-dark); font-weight:700; }
  p.sub { color:var(--grey); margin:0 0 24px; font-size:14px; line-height:1.5; }
  label { display:block; font-size:12.5px; font-weight:600; color:var(--navy-dark); margin:16px 0 6px; }
  input { width:100%; padding:13px 15px; border:1.5px solid #e2e2e2; border-radius:10px; font-size:15px; font-family:inherit; }
  button.submit { margin-top:24px; width:100%; padding:14px; background: linear-gradient(135deg, var(--navy), var(--navy-dark)); color:#fff; border:none; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; }
  .badge { display:inline-block; background: linear-gradient(135deg, var(--gold-light), var(--gold)); color:var(--navy-dark); font-size:11px; font-weight:700; padding:5px 12px; border-radius:20px; margin-bottom:16px; }
  .footnote { margin-top: 28px; padding-top:18px; border-top:1px solid var(--line); font-size:11px; color:#aaa; text-align:center; }
  .voucher-box { background: linear-gradient(135deg, var(--navy), var(--navy-dark)); color:#fff; border-radius:12px; padding:20px 22px; margin-bottom:22px; }
  .voucher-box .amt { font-size:30px; font-weight:800; color:var(--gold-light); }
  .voucher-box .exp { font-size:12px; opacity:0.85; margin-top:5px; }
</style>
</head>
<body>
  <div class="wrap ${bodyClass}">
<div class="topbar"><div class="mark">SP</div><span>STUDENT PORTAL</span></div>
    <div class="content">
      ${content}
      ${showFooterNote ? `<div class="footnote">Research Simulation Environment &middot; The Ethical Phish</div>` : ""}
    </div>
  </div>
</body>
</html>`;
}

// ---------- Home / presenter console ----------
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
        <a href="/generate-qr?condition=A" style="color:var(--navy); font-weight:600;">Condition A — Plain</a><br><br>
        <a href="/generate-qr?condition=B" style="color:var(--navy); font-weight:600;">Condition B — Incentive</a>
      </p>
      <label>Live dashboard</label>
      <p style="font-size:14px;"><a href="/dashboard" style="color:var(--navy); font-weight:600;">Open live dashboard →</a></p>
    `,
  }));
});

// ---------- QR generation ----------
app.get("/generate-qr", async (req, res) => {
  const condition = (req.query.condition || "A").toUpperCase() === "B" ? "B" : "A";
  const targetUrl = `${BASE_URL}/consent/${condition}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 400, margin: 2, color: { dark: "#1F3864", light: "#FFFFFF" } });
    res.send(pageShell({
      title: `QR Code — Condition ${condition}`,
      showFooterNote: false,
      content: `
        <span class="badge">CONDITION ${condition} &middot; ${conditionLabel(condition).toUpperCase()}</span>
        <h1>Scan to open the simulated page</h1>
        <div style="text-align:center; padding:20px; background:#fafafa; border-radius:12px;">
          <img src="${qrDataUrl}" alt="QR code" style="width:100%; max-width:320px;">
        </div>
        <p style="font-size:12px; color:#888; word-break:break-all; margin-top:14px;">${targetUrl}</p>
      `,
    }));
  } catch (err) {
    res.status(500).send("Failed: " + err.message);
  }
});

// ---------- Consent screen ----------
app.get(["/consent", "/consent/:condition"], (req, res) => {
  const raw = req.params.condition || req.query.condition || "A";
  const condition = raw.toUpperCase() === "B" ? "B" : "A";
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
      <button class="submit" id="agreeBtn">I Agree — Continue</button>
      <button id="declineBtn" style="margin-top:12px; width:100%; padding:13px; background:#fff; color:var(--grey); border:1.5px solid #e2e2e2; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer;">I Don't Consent</button>
      <div id="declineMsg" style="display:none; margin-top:18px; text-align:center; font-size:13px; color:var(--grey);">That's completely fine — you can close this page now. Thank you for considering it.</div>
    `,
  }) + `
  <script>
    const participantId = ${JSON.stringify(participantId)};
    const condition = ${JSON.stringify(condition)};

    fetch("/log-event", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ participantId, condition, action: "consent_viewed", timeToDecision: 0 }) }).catch(()=>{});
    document.getElementById("agreeBtn").addEventListener("click", function () {
      fetch("/log-event", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ participantId, condition, action: "consent_agreed", timeToDecision: 0 }) }).finally(() => {
        window.location.href = "/sandbox/" + condition + "?pid=" + encodeURIComponent(participantId);
      });
    });
    document.getElementById("declineBtn").addEventListener("click", function () {
      fetch("/log-event", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ participantId, condition, action: "consent_declined", timeToDecision: 0 }) }).catch(()=>{});
      document.getElementById("agreeBtn").style.display = "none";
      document.getElementById("declineBtn").style.display = "none";
      document.getElementById("declineMsg").style.display = "block";
    });
  </script>
  `);
});

// ---------- Sandbox pages ----------
app.get("/sandbox/:condition", (req, res) => {
  const condition = req.params.condition.toUpperCase() === "B" ? "B" : "A";
  const participantId = typeof req.query.pid === "string" && req.query.pid.length > 0 ? req.query.pid : randomUUID();

  const formContent = condition === "B" ? `
      <span class="badge">LIMITED TIME</span>
      <h1>Claim Your Exam-Season Voucher</h1>
      <p class="sub">Enrolled students get a free stationery pack this exam season — claim yours below.</p>
      <div class="voucher-box">
        <div class="amt">AED 50 Voucher</div>
        <div class="exp">Offer expires at the end of exam week</div>
      </div>
      <form id="quishForm">
        <label>Full Name</label><input type="text" placeholder="e.g. Aisha Khan" required>
        <label>Student Email</label><input type="email" placeholder="e.g. student@campusmail.edu" required>
        <label>Student ID</label><input type="text" placeholder="e.g. ND2026-1234" required>
        <button type="submit" class="submit">Claim Voucher</button>
      </form>
  ` : `
      <h1>Student Services — Password Reset</h1>
      <p class="sub">Enter your details to continue resetting your student portal password.</p>
      <form id="quishForm">
        <label>Student ID</label><input type="text" placeholder="e.g. ND2026-1234" required>
        <label>Current Password</label><input type="password" placeholder="••••••••" required>
        <button type="submit" class="submit">Continue</button>
      </form>
  `;

  res.send(pageShell({
    title: condition === "B" ? "Claim Your Exam Voucher" : "Student Services",
    content: formContent,
  }) + `
  <script>
    const participantId = ${JSON.stringify(participantId)};
    const condition = ${JSON.stringify(condition)};
    const startTime = Date.now();
    fetch("/log-event", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ participantId, condition, action: "viewed", timeToDecision: 0 }) }).catch(()=>{});
    document.getElementById("quishForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const timeToDecision = (Date.now() - startTime) / 1000;
      fetch("/log-event", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ participantId, condition, action: "submitted", timeToDecision }) }).finally(() => {
        window.location.href = "/debrief?condition=" + condition + "&t=" + timeToDecision.toFixed(1);
      });
    });
  </script>
  `);
});

// ---------- Event logging ----------
app.post("/log-event", (req, res) => {
  const { participantId, condition, action, timeToDecision } = req.body || {};
  if (!participantId || !condition || !action) return res.status(400).json({ error: "Missing fields" });
  insertEvent({
    participant_id: String(participantId),
    condition_id: String(condition).toUpperCase() === "B" ? "B" : "A",
    action: String(action),
    time_to_decision: typeof timeToDecision === "number" ? timeToDecision : null,
  });
  res.json({ ok: true });
});

// ---------- Debrief ----------
app.get("/debrief", (req, res) => {
  const condition = (req.query.condition || "A").toUpperCase() === "B" ? "B" : "A";
  const t = req.query.t ? `${req.query.t}s` : "—";
  res.send(pageShell({
    title: "Debrief",
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

// ---------- Stats ----------
app.get("/api/stats", (req, res) => {
  const events = readEvents();
  const totals = { total: new Set(events.map(e => e.participant_id)).size };
  const byCondition = {};
  for (const c of ["A", "B"]) {
    const consentViews = new Set(events.filter(e => e.condition_id === c && e.action === 'consent_viewed').map(e => e.participant_id)).size;
    const consented = new Set(events.filter(e => e.condition_id === c && e.action === 'consent_agreed').map(e => e.participant_id)).size;
    const declined = new Set(events.filter(e => e.condition_id === c && e.action === 'consent_declined').map(e => e.participant_id)).size;
    const views = new Set(events.filter(e => e.condition_id === c && e.action === 'viewed').map(e => e.participant_id)).size;
    const submits = new Set(events.filter(e => e.condition_id === c && e.action === 'submitted').map(e => e.participant_id)).size;
    const times = events.filter(e => e.condition_id === c && e.action === 'submitted').map(e => e.time_to_decision).filter(t => t);
    const avgTime = times.length ? times.reduce((a,b)=>a+b,0)/times.length : null;
    byCondition[c] = {
      consentViews, consented, declined,
      consentRate: consentViews > 0 ? Math.round((consented/consentViews)*1000)/10 : 0,
      views, submits,
      disclosureRate: views > 0 ? Math.round((submits/views)*1000)/10 : 0,
      avgTimeToDecision: avgTime ? Math.round(avgTime*10)/10 : null,
    };
  }
  const recent = [...events].reverse().slice(0, 15);
  res.json({ total: totals.total, byCondition, recent });
});

// ---------- Reset ----------
app.post("/api/reset", (req, res) => {
  writeEvents([]);
  res.json({ ok: true });
});

// ---------- Dashboard ----------
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.listen(PORT, () => {
  console.log(`The Ethical Phish running on port ${PORT}`);
});
