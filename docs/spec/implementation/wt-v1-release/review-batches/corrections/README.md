# Correction Briefs — Watchtower v1 Release

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: correction landing pad
Date: 2026-07-30

## Purpose

This directory holds correction briefs created when a review batch rejects an
implementation and follow-up work is required before re-review.

## Naming Convention

Numbered correction briefs follow this format:

```
REL-<batch-number>-correction-<sequence>.md
```

Example: `REL-01-correction-01.md` is the first correction for batch REL-01.

## Required Content

Every correction brief must include:

1. the rejected batch number and review batch reference
2. the rejection date and reviewer identity/session
3. each rejection reason with exact source location or proof failure
4. the expected corrected state for each reason
5. the required additional proof after correction
6. the exact files that must change
7. any architectural or ownership boundaries that were violated and must be
   restored
8. a statement that all other batch acceptance criteria remain unchanged
9. a reference to the review report containing the original rejection
10. a status line: open, in-progress (with assignee), or resolved (with
    acceptance commit)

## Correction Workflow

1. The reviewer creates the correction brief during rejection.
2. An implementation agent (the same or a different one) executes the
   correction.
3. The reviewer re-reviews the batch against both the original acceptance
   criteria and the correction brief.
4. On acceptance, the correction brief is marked resolved with the acceptance
   commit referenced.
5. The tracker, roadmap, and status docs are updated.

## Rules

- Correction briefs are committed artifacts. Keep them machine-neutral.
- Do not pile unaddressed corrections. Each rejection must be resolved or
  escalated to a specification amendment before the next batch in the
  dependency chain begins.
- A correction must not change scope beyond the original batch's deliverables
  unless the reviewer explicitly authorizes it.
- If a correction exposes a specification-level issue, record it in the
  correction brief with a reference to the governing spec document that needs
  amendment.
- For the release pack specifically: a BLOCKING finding in REL-04 that
  requires a prior pack fix must be forwarded to that pack's corrections,
  not held in the REL-04 correction brief. REL-04 corrections are limited to
  audit methodology errors (misclassified finding, missed document, incorrect
  severity).
