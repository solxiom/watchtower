# Independent Preparer Launch Prompt — SRC-EXP-02

Read completely:

1. `docs/research/source-intelligence-rejected.md`;
2. `docs/research/source-intelligence-evaluation/SRC-EXP-01-outcome.md`;
3. `docs/research/source-intelligence-evaluation/SRC-EXP-02-corrected-provider-evaluation.md`.

Act only as the independent preparer. Do not run a model comparison, install a
provider, score outputs, edit product/spec files, or commit.

Before the runner starts:

1. independently pin and verify repository commit/tree identities;
2. produce the seven exact prompts, answer-free scoring rules, budgets, and a
   counterbalanced 14-run sequential schedule;
3. correct T7 so its prompt names `docs:book:all` and
   `DocsBookAllBuildPluginHandler` and does not substitute another handler;
4. produce a separate hidden expected-evidence packet with mandatory paths,
   relationships, exclusions, and per-task scoring details;
5. compute the hidden packet's SHA-256 digest and byte count;
6. place only the public execution bundle and digest commitment in the
   SRC-EXP-02 fixture; and
7. keep the hidden packet outside the shared filesystem/context available to
   the runner until all execution stops.

Return the hidden packet only to the independent reviewer after the runner has
finished. The reviewer must be able to reproduce its digest and byte count.
Do not reveal raw SRC-EXP-01 answers to the runner or allow task results to
change expected evidence.
