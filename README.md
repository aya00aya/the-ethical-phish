# The Ethical Phish

**ENVISION 2026 — Quishing Research Framework**

A consent-based simulation framework for studying user vulnerability to QR code phishing, built for the ENVISION 2026 research contest.

**Consent is now built into the QR code itself.** Every QR code and every `/generate-qr` link leads to `/consent` first — participants must explicitly click "I Agree" before they ever see a simulated page. No one reaches `/sandbox/:condition` without passing through this gate (unless you deliberately share a raw sandbox link for your own testing, which the README below tells you not to do). `research-consent-form.md` is kept as a paper-based backup / ethics-board reference, but for actual data collection you no longer need to chase signatures — the digital flow below is the primary method.

## What's included

```
webapp/
├── server.js                    # All backend logic (routes, DB, QR generation, consent gate)
├── public/
│   └── dashboard.html           # Live auto-refreshing dashboard, including consent funnel
├── package.json
├── research-consent-form.md     # Paper-based backup / ethics-board reference (optional)
└── README.md                    # You are here
```

## How it works

| Route | What it does |
|---|---|
| `GET /` | Presenter console — links to QR codes and dashboard |
| `GET /generate-qr?condition=A\|B` | Renders a scannable QR code pointing at that condition's **consent** page |
| `GET /consent?condition=A\|B` | The digital consent gate — explains the study, requires "I Agree" before continuing, or "I Don't Consent" to opt out |
| `GET /sandbox/:condition` | The simulated landing page (A = plain password-reset mockup, B = incentive-framed voucher mockup) — only reachable after consent |
| `POST /log-event` | Logs `{participantId, condition, action, timeToDecision}` — never form field values. Actions: `consent_viewed`, `consent_agreed`, `consent_declined`, `viewed`, `submitted` |
| `GET /debrief` | Immediate educational reveal, shown right after any submit |
| `GET /api/stats` | Live JSON stats (consent funnel + disclosure rates per condition, recent events) — polled by the dashboard every 5s |
| `GET /dashboard` | The live dashboard page itself |
| `POST /api/reset` | Wipes all logged events (use before a fresh demo or before the real pilot) |

**The funnel, end to end:**

```
Scan QR  →  /consent?condition=A  →  "I Agree" clicked  →  /sandbox/A?pid=...  →  submit / leave  →  /debrief
                     ↓ (consent_viewed logged)     ↓ (consent_agreed logged)        ↓ (viewed, then submitted logged)
```

The same anonymous participant ID is carried from the consent click through to the sandbox page (via `?pid=`), so you can trace one person's full journey — consent → view → submit — without ever knowing who they are.

Every event is stored in a local SQLite file (`events.db`), created automatically on first run.

## 1. Run it locally

Requires Node.js 18+.

```bash
cd webapp
npm install
npm start
```

Then open:
- Presenter console: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- QR code (Condition A): http://localhost:3000/generate-qr?condition=A
- QR code (Condition B): http://localhost:3000/generate-qr?condition=B

To scan the QR code with your phone while testing locally, your phone needs to reach your laptop's IP, not `localhost`. Either:
- Run `ipconfig` (Windows) / `ifconfig` or `ip addr` (Mac/Linux) to find your laptop's local IP (e.g. `192.168.1.42`), then start the server with:
  ```bash
  BASE_URL=http://192.168.1.42:3000 npm start
  ```
  (make sure your phone is on the same WiFi network), or
- Skip straight to the free public deployment below — this is more reliable for a live presentation anyway.

## 2. Deploy for free on Render.com (recommended for the live demo)

1. Push this `webapp/` folder to a new GitHub repository (or a `webapp` subfolder of your existing project repo).
2. Go to https://render.com → sign up / log in (GitHub login is fastest).
3. Click **New +** → **Web Service** → connect your GitHub repo.
4. Configure:
   - **Root Directory:** `webapp` (if it's a subfolder — leave blank if the repo root *is* webapp)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
5. Under **Environment**, add a variable:
   - `BASE_URL` = the URL Render will give you, e.g. `https://the-ethical-phish.onrender.com` (you can add this after the first deploy once you see the assigned URL, then redeploy).
6. Click **Create Web Service**. First deploy takes 2–5 minutes.
7. Visit your Render URL — you should see the presenter console. Regenerate your QR codes from `/generate-qr?condition=A` and `/generate-qr?condition=B` on the deployed URL (not localhost) before your presentation, since the QR image encodes `BASE_URL`.

**Free-tier note:** Render's free web services spin down after ~15 minutes of inactivity and take ~30–50 seconds to wake up on the next request. Visit your own dashboard and sandbox links 5–10 minutes before you go on stage to "warm up" the service, so it responds instantly during your actual demo.

## 3. Deploy on Railway (alternative)

1. Go to https://railway.app → New Project → Deploy from GitHub repo.
2. Select this repo/folder. Railway auto-detects Node and runs `npm install && npm start`.
3. Under **Variables**, add `BASE_URL` set to the public domain Railway assigns (Settings → Networking → Generate Domain).
4. Redeploy after adding `BASE_URL` so QR codes point to the live domain.

## 4. Before your real pilot (data collection)

1. Call `POST /api/reset` (e.g. `curl -X POST https://your-app.onrender.com/api/reset`) to clear any test data from your rehearsals.
2. Share the two QR codes (or direct `/consent?condition=A` and `/consent?condition=B` links — **never the raw `/sandbox/...` links**) with your intended participants.
3. Everyone who scans lands on the consent page first. Only those who click "I Agree" ever see the simulated page — this is your real, enforced consent record, not a signature you have to chase down separately.
4. Watch `/dashboard` fill in live, including the consent rate per condition, or check `/api/stats` afterward.
5. Copy the final numbers from the dashboard into Table 1 of your research paper. The consent rate itself is worth reporting too — it's a legitimate secondary metric ("X% of scanners agreed to continue after seeing the consent screen").

## 5. Before your live judge demo

1. Call `POST /api/reset` again right before your slot so the dashboard starts at zero and fills up live in front of judges.
2. Have the backup video and laminated printed QR code ready (see the presentation planner) in case venue WiFi drops.
3. Open the dashboard tab in your browser in advance so it's not loading live on stage.

## Ethical & data notes

- **Consent is enforced in code, not just on paper:** the sandbox route is never linked to directly — every path in, including every generated QR code, routes through `/consent` first.
- No credential or form-field values are ever read, transmitted, or stored — confirmed in `server.js`, where `e.preventDefault()` on submit means field contents are never even accessed by the client-side script, let alone sent to the server.
- Only anonymous, randomly generated participant IDs are logged — never names or emails.
- Every participant sees the debrief screen immediately after any submit action.
- Declining consent is a first-class outcome, not just a closed tab: clicking "I Don't Consent" logs that choice and shows a thank-you message — it's tracked data, not silence.
- This tool is for consented research and educational demonstration only.
