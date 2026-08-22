# 🌱 Garden of Memory

A simple spaced-repetition flashcard plugin for Obsidian. Cards grow through four stages — Seed, Pulp, Flower, Wilt — as you review them, styled as a "garden" dashboard in the sidebar.

## Features

- Turn any line containing `::` into a flashcard (front `::` back)
- Review cards in a dedicated sidebar view, grouped by growth stage
- Grading uses an SM-2-style spaced repetition algorithm to schedule the next review
- Dashboard stats: retention rate, cards due today, and a per-stage count
- Data is stored as plain JSON in your vault, so it's portable and syncs with your vault as-is

## Installation

1. Copy `main.ts` (compiled to `main.js`), `manifest.json`, and `styles.css` (if present) into `<your-vault>/.obsidian/plugins/garden-of-memory/`
2. Reload Obsidian, then enable **Garden of Memory** under **Settings → Community plugins**

## Usage

### Creating a card

Place your cursor on any line containing `::`, then run the command **"Check line for :: item"** (via the command palette, or bind it to a hotkey).

```
Capital of France :: Paris
```

- Everything before the first `::` becomes the card's front
- Everything after becomes the back (additional `::` in the back text is preserved)
- Empty front or back text is rejected with a notice, and no card is created

### Opening the garden view

Click the sun/snow icon in the ribbon to open the Garden of Memory view in the sidebar. It's organized into four sections, always shown in the same order:

| Stage | Meaning |
|---|---|
| 🌱 Seed | New, unreviewed cards |
| 🌿 Pulp | Reviewed at least once, still early |
| 🌹 Flower | Mature / well-retained cards |
| 🥀 Wilt | Cards graded poorly on the last review |

Each section always renders, even if empty ("No cards here yet.").

### Reviewing a card

Click a card's button to open its front. Click **Show Back** to reveal the answer, then grade your recall:

| Grade | Meaning |
|---|---|
| Poor | Didn't recall it — resets progress, moves to Wilt |
| Fair | Barely recalled |
| Average | Recalled with some effort |
| Good | Recalled comfortably |
| Excellent | Recalled instantly |

Grading updates the card's review interval, easiness factor, and next due date. Poor/Fair/Average/Good/Excellent below a "3" threshold resets the repetition streak; passing grades increase the interval and advance the card toward Flower.

**Exception — the four sample cards** included on first run (`ExampleSeededData`, `ExampleSproutedData`, `ExampleFlowerData`, `ExampleWiltedData`) are **locked**: grading them still updates their scheduling (interval, easiness factor, due date) but never moves them out of their starting stage. They're meant as a permanent visual reference for what each stage looks like, not real study material — delete their entries from `GardenOfMemory.json` if you don't want them.

### Dashboard

Below the four stage sections, a dashboard shows:
- **Rate of Retention** — percentage of all cards currently in the Flower stage
- **Cards due today** — cards whose due date has passed
- **Total Cards** — count across all stages
- A per-stage breakdown (Seed / Pulp / Flower / Wilt counts)

## Data storage

All cards are stored in a single JSON file at the root of your vault:

```
<your-vault>/GardenOfMemory.json
```

This is a flat array of `[id, cardData]` pairs (not Obsidian's usual per-plugin `data.json`), so it's visible in your file explorer and will sync via Obsidian Sync, git, or any other vault-sync method you use.

On first launch (no existing `GardenOfMemory.json`), the plugin seeds itself with 4 sample cards, one per stage, so the view isn't empty. If the file is missing or unreadable for any reason, the plugin quietly falls back to seeding these samples rather than showing an error.

Each card record looks like:

```json
{
  "id": "3f9a1c22",
  "front": "Capital of France",
  "back": "Paris",
  "state": 0,
  "repetitionCount": 0,
  "interval": 1,
  "easinessFactor": 2.5,
  "reviewedAt": 0,
  "dueDate": 1755878400000,
  "locked": false
}
```

| Field | Meaning |
|---|---|
| `id` | Unique 8-digit numeric ID |
| `front` / `back` | Card content |
| `state` | 0 = Seed, 1 = Pulp, 2 = Flower, 3 = Wilt |
| `repetitionCount` | Consecutive successful reviews |
| `interval` | Days until next review |
| `easinessFactor` | SM-2 easiness factor (min 1.3) |
| `reviewedAt` | Timestamp of last review (0 if never reviewed) |
| `dueDate` | Timestamp of next scheduled review |
| `locked` | If `true`, grading never changes `state` (used by the 4 sample cards) |

## Known limitations

- Only one card can be created per command run (per `::` on the current line)
- No built-in way to edit or delete a card from the UI — edit `GardenOfMemory.json` directly, or delete the file to reset to sample data
- No settings tab yet for customizing colors, stage names, or the SM-2 thresholds
- Card IDs are random 8-digit numbers with a collision check, not full UUIDs

## Roadmap ideas

- In-view card editing and deletion
- A settings tab (custom stage names/colors, review thresholds)
- Bulk import of `::` cards from a whole note
- Export/import of `GardenOfMemory.json` from the command palette