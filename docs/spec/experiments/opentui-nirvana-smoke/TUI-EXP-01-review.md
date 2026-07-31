# TUI-EXP-01 Independent Review

Status: **Completed — formal REJECT preserved; experiment closed**
Reviewer floor: `R4`

The final review found strong positive technical evidence but rejected the
submission under the all-gates protocol. The product consequence is recorded
separately in [TUI-EXP-01-outcome.md](TUI-EXP-01-outcome.md). No further review
or correction cycle is authorized for this disposable experiment.

The reviewer must be different from the executor and must independently inspect
the sandbox, dependency graph, distribution, terminal behavior, and evidence.
Executor conclusions are claims.

## Review Gates

| Gate | Required verdict |
| --- | --- |
| Watchtower isolation and disposable scope | PASS / FAIL |
| Nirvana/NVB fidelity | PASS / FAIL |
| Framework-free imperative OpenTUI | PASS / FAIL |
| Node/FFI bootstrap isolation | PASS / FAIL |
| Build/test/dist and relocated install | PASS / FAIL |
| Native artifact completeness/failure behavior | PASS / FAIL |
| PTY/tmux lifecycle and restoration | PASS / FAIL |
| Terminal/FFI security | PASS / FAIL |
| Measurements and bounded smoke | PASS / FAIL |
| Evidence reproducibility | PASS / FAIL |

Any failure means `REJECT`; there is no conditional acceptance.

## Independent Reproduction

The reviewer must:

1. prove the Watchtower worktree was not changed by the experiment;
2. inspect every sandbox source/config/dependency file;
3. verify the dependency tree contains no prohibited framework/toolchain;
4. rerun clean install, build, test, dist, package inventory, and isolated
   global-style install;
5. run `info` without FFI and prove OpenTUI/native modules are not loaded;
6. independently exercise every bootstrap and permission-model case;
7. rerun direct PTY/tmux resize, input, Unicode, signal, failure, suspend/
   resume, and restoration cases;
8. inject hostile terminal/FFI-selection inputs;
9. corrupt/remove/substitute the native artifact and verify bounded failure;
10. reproduce measurements and the 30-minute bounded smoke; and
11. compare all results to the experiment specification.

## Immediate Rejects

- Any Watchtower tracked-file modification.
- Reuse or transfer of Watchtower product source.
- System-wide install or undeclared host mutation.
- Non-TUI command requiring/loading OpenTUI or FFI without demonstrated need.
- Re-exec loop or lost argv/env/cwd/stdio/TTY/signal/exit semantics.
- React/Solid/Ink/JSX/Babel/Bun/framework-binding introduction.
- Runtime source-tree lookup, undeclared download, or required Zig compiler.
- Terminal damage after a required lifecycle path.
- Untrusted selection of an FFI library/symbol/signature/path.
- Missing required evidence or unreproducible claim.

## Review Output

Write:

```text
/home/kavan/Projects/watchtower/.local/agent-reports/experiments/TUI-EXP-01/
  review-report.md
```

Return `ACCEPT`, `REJECT`, or `SPEC_BLOCKED`. `ACCEPT` means the experiment
provides credible early evidence for the chosen direction. It does not accept
CA-18, seal Pack 5, authorize CA-19, or permit spike-code transfer.
