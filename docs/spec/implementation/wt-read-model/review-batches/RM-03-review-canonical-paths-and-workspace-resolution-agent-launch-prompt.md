# Agent Launch Prompt — Review Batch RM-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for path resolution and security-boundary review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

You are assigned **review batch RM-03** for the Watchtower v1 wt-read-model
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`. Then review brief, review README,
index, paired work brief, implementation report, v1.md (especially §7.1, §9.1),
v1-contracts.md, quality rules, and the actual changed source files.

## Your Review Mission

Independently verify path resolution, workspace discovery, and XDG handling:

1. **Data-home precedence**: Set `WATCHTOWER_DATA_HOME`, verify it's used. Unset, set `XDG_DATA_HOME`, verify fallback. Unset both, verify `~/.local/share/watchtower`.
2. **Workspace resolution**: Test explicit workspace, git toplevel (set up a temp git repo), ancestor with `.watchtower/lanes`, cwd. Test missing explicit → `ERR_WORKSPACE_NOT_FOUND`.
3. **Path escapes**: Inject `..` segments, symlink escapes, null bytes, control characters. Verify every attack class is rejected.
4. **Canonicalization**: Create a symlink, run through `canonicalizePath`, verify resolved target.
5. **No directory creation**: Call every resolution function on a clean temp dir. Verify no directories are created.
6. **Hard-reject checklist**, build/test rerun, tracker/roadmap sync.

## Acceptance Gate / Rejection / User Rule / Trackers / Local Artifact / Non-Negotiable

(Full sections per RM-01 review launch prompt.)

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/reviews/RM-03-canonical-paths-and-workspace-resolution-review.md`

## If accepted, create the acceptance commit

```
RM-03: Canonical paths and workspace resolution accepted
```

## Always plan and make task lists
