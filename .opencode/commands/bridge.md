---
description: Process pending Drawbridge UI annotation tasks from the browser.
---

# Drawbridge Command

You are processing visual UI annotation tasks created through the Drawbridge Chrome extension.

## Quick Start

1. Read `@.moat/moat-tasks-detail.json` first.
2. Use `@.moat/moat-tasks.md` as the human-readable summary.
3. If the skill tool is available, load `@.agents/skills/drawbridge-task-processor/SKILL.md`.
4. Follow `@.agents/workflows/bridge.md`.

If `$ARGUMENTS` is provided, treat it as the requested mode. Supported values are `step`, `batch`, and `yolo`. If no mode is provided, use `step`.

Only process tasks that are currently `to do` unless the user explicitly asks otherwise.

## Required Files

- `@.moat/moat-tasks-detail.json` - source of truth
- `@.moat/moat-tasks.md` - readable task checklist
- `.moat/screenshots/` - visual context when referenced by `screenshotPath`

## Status Lifecycle

Every task must follow this exact sequence:

`to do` -> `doing` -> `done`

Never skip `doing`.

## Processing Expectations

- detect task dependencies before implementation
- preserve project conventions and existing architecture
- use screenshots when available
- keep markdown synchronized after JSON status updates
- report changed files and verification after processing

## Processing Modes

- `step` - one task at a time
- `batch` - grouped related tasks
- `yolo` - fully autonomous, only when explicitly requested

## Common Annotation Examples

### Styling Changes

- `make this blue` -> Changes color
- `bigger font` -> Increases font size
- `add shadow` -> Adds drop shadow effect
- `make it round` -> Adds border radius

### Layout Changes

- `center this` -> Centers the target element
- `move this closer to the title` -> Reduces spacing between elements
- `make this section wider` -> Increases width or max-width
- `align this with the button` -> Matches positioning or alignment

## Dependency Examples

- `make this button blue` -> `move that blue button right`
- `increase the card width` -> `center the wider card`
- `replace this icon` -> `align the new icon with the title`

If a later task depends on a visual state created by an earlier task, process them in order.
