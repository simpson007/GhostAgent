---
inclusion: always
---

# Technical constraints

- Browser: semantic HTML, responsive CSS, native ES modules, no build step.
- Server: Node.js 22+, built-in HTTP and fetch only, bound to 127.0.0.1.
- Keep model credentials in .env on the server, never in static files or localStorage.
- Serve public assets via an explicit allowlist. Do not serve .env or repository metadata.
- Model outputs are untrusted data. Validate structure and length; render with textContent.
- Run previews in an opaque-origin sandbox="allow-scripts allow-forms" iframe; allow-forms enables local submit handlers. Starter CSP blocks actual outbound form submissions and network requests.
- Handle storage, clipboard, upstream errors and invalid input explicitly.
- Use local calendar dates, not UTC dates, for habit check-ins.
- Tests: npm test. Keep deterministic generation tests separate from optional live model calls.
- Do not mark an unchecked task complete without implementing and checking it.
