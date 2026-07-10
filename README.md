# AI Healing Demo Site

A small, disposable static website (login, dashboard, products, users, orders)
used as a live target for verifying real AI self-healing of Playwright
locators. No backend, no database — client-side JavaScript renders every
page's content and holds state in memory for the session.

This site intentionally has **no Playwright tests of its own**. The tests
that exercise it (20 cases across login/logout, products, users, orders,
dashboard cards, and navigation) live in the
[AI-Autonomous-QA-Platform](https://github.com/Pooja-Marne/AI-Autonomous-QA-Platform)
repo, under `tests/playwright/specs/demoSite/`, so they run through that
platform's real self-healing pipeline, dashboard, and Locator Repository —
this site is just the target they point at.

## Breaking a locator on demand — "Chaos Mode"

Every interactive element has a stable `data-test` attribute. `js/locatorChaos.js`
can intentionally rewrite specific `data-test` values to broken variants at
runtime, without a redeploy or any backend:

- **URL param**: `?chaos=on` / `?chaos=off` (persists to `localStorage`)
- **Console**: `localStorage.setItem('ahd_chaos', 'on')`

Once enabled, a `MutationObserver` keeps re-applying the break across
re-renders (search, add/delete rows, reopened modals), so it stays broken
until explicitly turned off — a real, reproducible failure for the healing
agent to detect and fix, not a one-time DOM edit.

## Tech stack

Plain HTML + CSS + JavaScript, served by a minimal Express static server
(`server.js`) — only present because Railway needs something to run; there
is no application backend or API.

## Running locally

```
npm install
npm start          # serves on http://localhost:8080
```

## Deployment

Deployed to Railway as a standalone static site, independent from the main
AI Autonomous QA Platform's deployment. Point the platform's
`DEMO_SITE_BASE_URL` environment variable at this site's Railway URL so the
`demo_site` test suite runs against it.
