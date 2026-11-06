# GhostAgent design

## Architecture

```text
Browser (static GitHub Pages or local server)
  index.html + styles.css
       ↓
  app.js: form, tabs, local history, sandbox, export
       ↓
  generator.js: idea analysis → three specs + vetted starter
       ↓
  zip.js: CRC32 + UTF-8 uncompressed ZIP

Optional local-only mode
  app.js → POST /api/generate → server.mjs → configured model
                             ← validated JSON plan
```

## Deliberate simplifications

- No user system, database, billing, agent orchestration or framework tooling.
- No direct Kiro API integration. .kiro specs and steering are files for continuing work in Kiro.
- Optional AI only improves planning; generated executable code always comes from vetted local templates.
- Only three dedicated starters; generic requests produce an explicitly limited list prototype.

## Files and boundaries

- generator.js is a pure data-to-project module, shared by browser and tests.
- app.js owns transient UI state and bounded browser history.
- zip.js implements store-method ZIP to avoid external dependencies/CDNs.
- server.mjs serves an explicit public allowlist; keys come from process environment or .env.
- The API validates same-origin POST requests, size, plan schema and a 45-second model timeout.
- Public hosting ships no server credentials and never calls the local API automatically.

## Data

Project: id, createdAt, name, idea, mode, kind, preset, documents and code.

History is JSON in localStorage under ghostagent-projects-v1, capped at 8 entries. Starter data uses a separate idea-scoped key. Habit dates use browser local YYYY-MM-DD.

## Rendering and preview

Specs are rendered with text nodes and a small Markdown subset. No model HTML is executed. Preview uses srcdoc in sandbox="allow-scripts allow-forms" without allow-same-origin or top-navigation privileges. Local submit handlers are allowed, but a starter CSP blocks outbound forms and network requests. Downloaded starters use normal HTTP origins for persistence.

## Deployment

Copy the public HTML, CSS, JS and assets to GitHub Pages. Workflow runs Node tests first. Optional AI uses npm start on the developer's local machine; it is not a GitHub Pages feature.
