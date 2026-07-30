# Agent Launch Prompt — Review Batch CA-07

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for decision envelope review and semantic-digest stability verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying envelope determinism, semantic-digest
stability, and untrusted-content delimiting.

You are assigned **review batch CA-07** for the Watchtower v1
wt-coordinator-automation delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/review-batches/CA-07-review-immutable-decision-envelopes.md`
2. `docs/spec/implementation/wt-coordinator-automation/review-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-07-immutable-decision-envelopes.md` (paired work brief)
5. `.local/agent-reports/coordinator-automation/CA-07-immutable-decision-envelopes.md` (implementation report)
6. `docs/spec/v1-contracts.md` — especially §3.4 (RFC 8785), §5
7. `docs/spec/coordinator-automation.md` — especially §8
8. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/contracts/decision.ts`
    - `src/foundation/decision-envelope.ts`
    - `spec/basic/decision-envelope-spec.ts`

## Your Review Mission

Independently verify decision envelopes are deterministic and correctly bounded:
1. Construct envelopes from identical inputs. Verify identical output.
2. Compute semantic digest. Prove stable (same inputs → same digest).
3. Prove `createdAt` and `cycleId` excluded from semantic digest.
4. Verify digest changes when authoritative inputs change.
5. Verify bounded context: no full-pack preloading, no full journal history.
6. Verify untrusted content is labeled and delimited.
7. Verify no credentials in envelopes.
8. Run `nvb build` and `nvb test` independently.
9. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject items clear.
- Deterministic envelopes.
- Semantic digest stable and excludes operational metadata.
- Bounded context — no full-history preloading.
- Untrusted content delimited.
- No credentials.
- Build and tests pass.
- Implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create `review-batches/corrections/CA-07-correction-01.md`.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Update tracker and roadmap after acceptance or rejection.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/coordinator-automation/reviews/CA-07-immutable-decision-envelopes-review.md`

## If accepted, create the acceptance commit

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer
