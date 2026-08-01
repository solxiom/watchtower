# Browser proof — coordinator playbook

For lanes using AwrUX `gulp watch:core-test`, `window.awrTestBridge`, and
Puppeteer/CDP verification. Normative testing rules remain in the target repo's
test-system spec and core-module testing guide; this document is **coordinator
recovery only**.

Source: RouteGroup v2 FRAME-B through FRAME-E (2026-07-18).

---

## Coordinator mindset

**Browser env failures are usually recoverable.** Before accepting a reviewer's
"cannot launch browser" reject or sending correction to the implementer:

1. List approved binaries **per OS account** (implementer account ≠ reviewer account)
2. Nudge the **reviewer** with explicit `CHROMIUM_PATH`
3. Confirm `gulp watch:core-test --port=<port>` is running under the **same account** as the runner

Implementer proof on account A does **not** satisfy independent review on account B
until the reviewer successfully reruns — but the coordinator must give the reviewer
working paths, not recycle the implementer.

---

## Approved browser paths (pattern)

Discover; do not assume one global path.

### Puppeteer cache Chrome (preferred when present)

```bash
find ~/.cache/puppeteer/chrome -name chrome -type f 2>/dev/null | head -5
```

Typical shape:

```text
~/.cache/puppeteer/chrome/linux-<version>/chrome-linux64/chrome
```

Run discovery **as each lane account** (`sudo -u <account> -H find ...`). Cache
on the primary account may be absent on secondary reviewer accounts.

### Flatpak Google Chrome (secondary-account fallback)

When puppeteer cache is missing:

```bash
find /var/lib/flatpak/app/com.google.Chrome -path '*/files/extra/chrome' -type f -executable 2>/dev/null | head -1
```

Stable symlink form (verify on machine):

```text
/var/lib/flatpak/app/com.google.Chrome/current/active/files/extra/chrome
```

### Snap Chromium — treat as **blocked** for Puppeteer

`/snap/bin/chromium` often fails with cgroup / user-bus errors under Puppeteer.
Do **not** accept "Snap blocked" as lane-complete blocker without trying
puppeteer-cache or Flatpak first.

---

## Standard proof transport

| Transport | Role |
|-----------|------|
| **CDP + `window.awrTestBridge.run(...)`** | Authoritative terminal report |
| HTTP `/ux-dev-api/test/status` | Session readiness only |
| HTTP `/ux-dev-api/test/run` | Transport dispatch — `202` is **not** completed proof |

On direct-Gulp topology, HTTP often reports `browserConnected: false` while CDP
proof still works. Do not reject implementer handoff solely on HTTP disconnect.

---

## CDP serialization trap (critical)

Bridge run reports may hold **live runtime objects** (`state`, `transition`) with
circular references. Returning the rich report through `page.evaluate` silently
yields `undefined` (no throw) → polling loops forever → "report never completed."

**Fix (implementer/reviewer runner):** reduce report to **primitives inside the
browser** before crossing CDP.

Pattern used in RouteGroup v2 (local scratchpad runner — never commit):

```js
// Inside page.evaluate after run settles:
return {
  status: report.status,
  durationMs: report.durationMs,
  totals: report.totals,
  // never return report object wholesale
};
```

Coordinator symptom: reviewer or implementer claims tests pass in-page but CDP
driver never sees terminal report → check serialization before blaming tests.

---

## Isolated selections vs monolithic runs

**Do not** run entire integration modules as one combined bridge selection when
the module is not isolation-safe. RouteGroup v2 accepted pattern:

- One `select({query})` per focused case or per `*.test.js` file substring
- Seven integration cases run **individually**, not one 30-test back-to-back group

Coordinator nudge language: "bounded per-case runs are lane-sanctioned."

---

## Coordinator nudge template (reviewer env recovery)

```text
Operator rule: DO NOT STOP MID-REVIEW. Continue until formal ACCEPT or REJECT.

Browser proof recovery — use approved non-Snap Chrome:
CHROMIUM_PATH=<absolute-path-to-chrome>

Start: gulp watch:core-test --port=9090 (under same account as runner)
Run: QUERY=<case-substring> CHROMIUM_PATH=... PORT=9090 node <runner.js>

Handoff raw artifacts: .local/agent-reports/<lane>/extensions/<BATCH>-raw-reports/
If matrix green, ACCEPT and commit. Do not re-reject for env without trying this path.
```

Adjust port, paths, and runner location per lane config.

---

## Implementer handoff requirements (browser lanes)

Before dispatching review, confirm handoff includes:

- [ ] Exact `CHROMIUM_PATH`(s) verified executable **per account** that may run proof
- [ ] `gulp watch:core-test` port and account
- [ ] Runner script path (or inline recipe) with `QUERY` convention
- [ ] Per-run terminal JSON under `.local/...`-raw-reports/ when matrix is large
- [ ] Explicit note: Snap Chromium is not an approved path
- [ ] Totals table: selected count, passed/failed/errored/skipped, duration, page errors

Reviewers should not hunt for Chrome paths the implementer already validated.

---

## Known pre-existing console noise

Some suites emit `awr.scopeManager` compile-timeout diagnostics in untouched
suites. Classification:

- **Expected** registry/route diagnostics in failure-path tests
- **Known compile-timeout** in unrelated legacy suites — count separately; do not
  treat as batch regression without failed tests

Coordinator: do not force implementer correction for classified pre-existing noise
when reviewer agrees tests passed.

---

## Primary vs secondary account strategy

| Strategy | When |
|----------|------|
| Proof on **primary account** | Default for integration batches when secondary Chromium is flaky |
| Proof on **reviewer account** | Required for independent re-review — coordinator must supply working path |
| Dual-path documentation | Handoff lists both accounts' approved binaries |

HtmlTreeUpdater lane note: "run browser proofs on primary account" still applies
for **implementer** work; **reviewer** must independently attach on their account
or coordinator supplies cross-account runnable path.

---

## Recovery checklist (coordinator)

```text
[ ] watch:core-test running on expected port
[ ] CHROMIUM_PATH executable (ls -l / test -x)
[ ] Same OS user for gulp and node runner
[ ] Not Snap Chromium
[ ] Runner reduces CDP payload to primitives
[ ] Per-case queries for isolation-sensitive modules
[ ] Terminal report: nonzero selection, status=passed, duration present
```
