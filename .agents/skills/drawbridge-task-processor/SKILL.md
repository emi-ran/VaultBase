---
name: drawbridge-task-processor
description: Processes Drawbridge UI annotation tasks from .moat task files and keeps status updates synchronized.
---

# Drawbridge Task Processor

## When To Use This Skill

- Use this when the workspace contains Drawbridge task files in `.moat`.
- Use this when a command or workflow asks you to process pending Drawbridge tasks.

## How To Use It

1. Read `.moat/moat-tasks-detail.json` first.
2. Load screenshots referenced by `screenshotPath` when available.
3. Move each task through `to do` -> `doing` -> `done`.
4. Keep `.moat/moat-tasks.md` synchronized with the JSON source of truth.
5. Preserve existing project conventions while implementing changes.
