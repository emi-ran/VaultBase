---
trigger: always_on
---

# Drawbridge Rule

- Treat `.moat/moat-tasks-detail.json` as the source of truth.
- Preserve the exact task lifecycle: `to do` -> `doing` -> `done`.
- Keep `.moat/moat-tasks.md` synchronized with the JSON file.
- Use screenshots from `.moat/screenshots/` when available.
- Do not delete Drawbridge task data unless the user explicitly asks for cleanup.
