---
description: Process Drawbridge tasks from .moat with the shared rule and skill files.
---

# Drawbridge Workflow

Use this workflow when a workspace contains Drawbridge task files.

## Required Inputs

- Read `.moat/moat-tasks-detail.json` first.
- Read `.moat/moat-tasks.md` for the human summary.
- Load screenshots from `.moat/screenshots/` when a task includes `screenshotPath`.

The JSON file is the source of truth for comments, selectors, timestamps, geometry, and screenshot references.

## Rules

- The JSON file is the source of truth.
- Use the exact task lifecycle: `to do` -> `doing` -> `done`.
- Never skip `doing`.
- Keep `.moat/moat-tasks.md` synchronized after JSON changes.
- Preserve task ordering unless dependency analysis requires a different order.
- Preserve the target project's existing conventions rather than introducing a new style.

## Mode Selection

- Default to `step` mode.
- Use `batch` only for clearly related tasks.
- Use `yolo` only when the user explicitly requests it.

### Mode Guidance

- use `step` when tasks are ambiguous, risky, or need confirmation between changes
- use `batch` when several tasks affect the same component, screen, or style system
- use `yolo` only when the user explicitly wants maximum autonomy

## Dependency Checks

Look for references like "that button", "the updated card", "the blue state", or follow-up wording that depends on an earlier task. Process those tasks after their prerequisites.

Examples:

- `make this button blue` -> `move that blue button right`
- `increase the card width` -> `center the wider card`
- `replace this icon` -> `align the new icon with the title`

If a later task depends on a visual state created by an earlier task, do not process them out of order.

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

## Implementation Expectations

- adapt to the project stack and existing styling approach
- prefer modifying existing components over duplicating UI
- use screenshot context when available, but continue with selector and comment data if a screenshot is missing
- update task status before and after implementation, not only at the end

## Completion Output

For each processed task, report:

- the task id or title
- the files changed
- whether screenshot context was available
- the verification that was run

## Failure Handling

If a task cannot be completed:

- explain the blocker clearly
- leave the task out of `done`
- preserve synchronization between JSON and markdown
- avoid deleting task data unless the user explicitly asks for cleanup
