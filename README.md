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

## Breaking a locator on demand

Every interactive element has a stable `data-test` attribute. To intentionally
break one for a demo, edit its value directly in the relevant `.html` file
(e.g. change `data-test="create-order-button"` to something else in
`orders.html`) and redeploy.

That rename sticks even though `js/app.js` rebuilds each page's content on
every load: `captureDataTestOverrides()` reads the as-served `data-test`
value for every `[id][data-test]` element before any rendering happens, and
`testId(elementId, fallback)` re-injects that captured value into the
template — so your edit survives re-renders (search, add/delete rows,
reopened modals) instead of reverting to the hardcoded default.

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
