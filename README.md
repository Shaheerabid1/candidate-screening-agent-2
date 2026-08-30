# Talent Bench — HR Candidate Screening Agent

A frontend HR dashboard for screening, scoring, ranking, and scheduling interviews with job candidates. Built with plain HTML, CSS, and JavaScript — no build step, no backend, no API keys.

## How to run it

1. Unzip the project.
2. Open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari).

That's it — there is no server or install step. Everything (candidate data, scoring, interviews, notifications) is simulated in the browser with JavaScript and resets on page reload.

## Project structure

```
candidate-screening-agent/
│
├── index.html        Application shell — all pages/sections live here
├── css/
│   └── style.css     Design system + layout + component styles
├── js/
│   └── app.js         All application logic and sample data
└── README.md
```

## What's inside

- **Dashboard** — total candidates, qualified candidates, interviews scheduled, average score, recent candidates, top-ranked candidates, and quick statistics.
- **Candidates** — full candidate list with search.
- **Upload Candidate** — add a candidate, select a CV file, and run a simulated AI screening pass (skills match, experience score, overall score, recommendation).
- **Rankings** — candidates sorted by score with status filters and search.
- **Candidate Details** — a modal with contact info, skills, score breakdown, and actions to schedule an interview, mark qualified, or reject.
- **Interviews** — schedule interviews (candidate, date, time, type) and view the scheduled list; dashboard stats update automatically.
- **Notifications** — a simulated log of email and Slack notifications sent when interviews are scheduled.
- **HR Assistant** — a simple chat interface with suggested questions that answers using the live candidate data in the app.

## Notes on the simulation

Since this is a frontend-only project, there is no real AI model or resume parser behind the scoring. Skill detection and scoring are simulated in `js/app.js`:

- Each open position has a relevant skill pool (e.g. a Frontend Developer role weighs HTML/CSS/JavaScript/React more heavily).
- Uploading a candidate simulates "parsing" their CV by sampling from that pool, then computing a skills-match score, an experience score (from years of experience), and a weighted overall score.
- The overall score maps to a recommendation: 90–100 Highly Recommended, 75–89 Recommended, 60–74 Consider, below 60 Not Recommended.

All data is in-memory only — refreshing the page resets the app back to its 6 sample candidates.
