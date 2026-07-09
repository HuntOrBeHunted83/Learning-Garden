# Name Meanings

## FlashCard
A normal flashcard with the following fields:

  - `id`
  - `header`
  - `front`
  - `back`
  - `note`

  **User input:**
  - Header
  - Front
  - Back
  - Notes

## GardenCard
A flashcard with additional spaced-repetition data:

  - `NoOfRepetitions`
  - `EasinessFactor`
  - `LastReviewDate`
  - `IntervalDays`

## GardenStates
Computed from `LastReviewDate` and `IntervalDays` for each `GardenCard`.

  - **Seed:** `LastReviewDate` is `NULL`.
  - **Sprout:** reviewed once; `NoOfRepetitions` is `1`.
  - **Flower:** due soon or due today, meaning `CurrentDate + 2 days >= LastReviewDate + IntervalDays`.
  - **Wilted:** overdue, meaning `CurrentDate > LastReviewDate + IntervalDays`.

## QualityScore (q)
A single-event rating that shows how well the flashcard is known. It does not need to be stored.

  - Range: `0` to `5`
  - `5` = perfect recall
  - `4` = correct, but with a little hesitation
  - `3` = correct, but only after real effort
  - `2` = wrong, but the answer felt familiar
  - `1` = wrong, but you recognized the answer afterward
  - `0` = complete blackout

## EasinessFactor (EF)
A measure of how easy the card is to remember. It varies from `1.3` to `5` and is computed using the SM-2 algorithm.

Formula:

`EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))`

## NoOfRepetitions
The number of times the `GardenCard` has been opened.

## IntervalDays
How long until the card can be displayed again.

## SM Algorithm
The algorithm that finds the next interval and the new easiness factor score.

## Requirements
Given a flashcard, it can be converted into a garden card.

## MVP Scope
Flashcard creation is not in scope for the project.

  - A given flashcard can be converted into a garden card.

## Other Scopes / Add-ons
Possible future features:

  - Flashcards can be created, edited, and deleted.
  - Garden cards can be created, edited, and deleted.

## Main Level Design
1. User creates a flashcard.
   - Flashcard is generated from a note or heading.
   - Flashcard data is saved in the vault storage system.

2. Flashcard appears in the garden.
   - Each flashcard is visualized as a plant.
   - User can click the plant to review the flashcard.

3. Reviews are scheduled via spaced repetition.
   - SM-2 algorithm computes the next review time.
   - Schedule is updated after each review response.

4. Flashcards have visual states in the garden.
   - Seed: new card.
   - Sprout: reviewed once.
   - Flower: due soon or due today.
   - Wilted: overdue.

5. Progress data is tracked.
   - Daily streak of completed reviews.
   - Number of cards needing review today.
   - Retention metrics.