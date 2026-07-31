# CA-18–CA-24 TUI Interface Contracts

Status: **Normative within the repacked draft**
Date: 2026-07-31

These are framework-neutral ownership contracts, not implementation. Exact
public reason/event/schema identifiers remain owned by v1 contracts and must be
reconciled before code is accepted. All collections, text, pages, queues, and
caches carry policy-defined finite limits.

## CA-18 Qualification Handoff

```ts
interface TuiFeasibilityDecision {
  verdict: 'PASS' | 'FAIL' | 'SPEC_BLOCKED'
  nodeRange: string
  enginePackages: readonly { name: string; version: string; integrity: string }[]
  bootstrap: 'process-flag' | 'posix-execve' | 'focused-launcher'
  supportedTargets: readonly TuiRuntimeTarget[]
  adapterContractRevision: string
  evidenceRefs: readonly string[]
}

interface TuiRuntimeTarget {
  os: string
  cpu: string
  libc?: string
  nativePackage: string
  artifactIntegrity: string
}
```

Only `PASS` is consumable by CA-19. The handoff includes no product object or
mutation authority.

## CA-19 Shell Contract

```ts
interface NirvanaTuiAdapter {
  capabilities(): TuiCapabilities
  open(options: TuiOpenOptions): Promise<TuiSurface>
}

interface TuiSurface {
  render(frame: TuiFrame): void
  events(signal: AbortSignal): AsyncIterable<TuiInputEvent>
  close(reason: TuiCloseReason): Promise<void>
}

interface TuiLayoutResolver {
  resolve(size: TuiSize, preferences: TuiDisplayPreferences): TuiLayout
}

interface TuiFocusManager {
  current(): TuiFocusTarget
  transition(intent: TuiFocusIntent, layout: TuiLayout): TuiFocusTransition
}

interface TuiActionRegistry {
  resolve(actionId: string, context: TuiActionContext): TuiActionResolution
  inspect(context: TuiActionContext): readonly TuiActionDescriptor[]
}

interface TuiThemeResolver {
  resolve(capabilities: TuiCapabilities, preferences: TuiDisplayPreferences): TuiTheme
}
```

`TuiActionResolution` describes availability, focus scope, observer eligibility,
mutation class, and confirmation requirement; it never executes product work.

## CA-20 Conversation Contract

```ts
interface ConversationPagePort {
  page(request: ConversationPageRequest, signal: AbortSignal): Promise<ConversationPage>
}

interface ConversationWindow {
  reduce(event: ConversationWindowEvent): ConversationWindowState
  visible(): readonly ConversationItemViewModel[]
}

interface ComposerController {
  state(): ComposerState
  reduce(intent: ComposerIntent): ComposerTransition
  preflight(): ComposerPreflight
}

interface CompletionPort {
  complete(request: CompletionRequest, signal: AbortSignal): Promise<CompletionPage>
}

interface ReferenceResolutionPort {
  resolve(reference: ExplicitReference, signal: AbortSignal): Promise<ReferenceResolution>
}
```

Every page/result carries cursor, revision, truncation, and limit metadata.
Composer preflight returns either a deterministic command intention, one
bounded natural-language turn, or a refusal; it never invokes either.

## CA-21 Inspector And Action Contract

```ts
type InspectorViewId =
  | 'sessions' | 'lane' | 'batches' | 'agents' | 'budgets'
  | 'holds' | 'proposals' | 'events' | 'context'

interface InspectorQueryPort {
  query(request: InspectorQueryRequest, signal: AbortSignal): Promise<InspectorPage>
}

interface InspectorRegistry {
  describe(): readonly InspectorViewDescriptor[]
  present(page: InspectorPage): InspectorViewModel
}

interface TuiActionDispatcher {
  preview(intent: TuiActionIntent): Promise<TuiActionPreview>
  dispatch(confirmed: ConfirmedTuiAction): Promise<TuiActionResult>
}

interface OverlayController {
  open(request: OverlayRequest): OverlayTransition
  reduce(intent: OverlayIntent): OverlayTransition
}
```

The dispatcher delegates to accepted shared command/session capabilities.
Confirmation state alone grants no authority.

## CA-22 Live Attachment Contract

```ts
interface TuiAttachmentController {
  start(binding: AttachmentBinding, signal: AbortSignal): Promise<AttachmentResult>
  submit(request: BoundedTurnRequest): Promise<TurnAdmission>
  wait(turnId: string, signal: AbortSignal): Promise<DurableTurnResult>
}

interface PresentationEventReducer {
  reduce(state: TuiViewModel, event: ValidatedPresentationEvent): TuiViewModel
}

interface ProvisionalTurnAccumulator {
  append(chunk: NormalizedTurnChunk): ProvisionalUpdate
  validate(result: ValidatedTurnResult): ValidatedReplacement
  interrupt(reason: string): InterruptedReplacement
}

interface NotificationRefreshController {
  refresh(checkpoint: DurableCheckpoint, signal: AbortSignal): Promise<NotificationUpdate>
}
```

Observer bindings expose only durable M0 query/notification inputs. Queue,
accumulator, refresh, and cache maxima are mandatory constructor policy.

## CA-23 Terminal Safety Contract

```ts
interface TerminalLifecycleController {
  enter(): Promise<TerminalLease>
  suspend(lease: TerminalLease): Promise<void>
  resume(lease: TerminalLease): Promise<void>
  restore(lease: TerminalLease, reason: TerminalRestoreReason): Promise<void>
  emergencyRestore(): void
}

interface TerminalContentSanitizer {
  sanitize(input: UntrustedTerminalText, context: TerminalTextContext): SafeTerminalText
  copy(input: SafeTerminalText, action: ExplicitCopyAction): CopyPayload
}

interface AccessibleTuiPresenter {
  present(model: TuiViewModel, mode: AccessibilityMode): AccessibleFrame
  announcements(previous: TuiViewModel, next: TuiViewModel): readonly Announcement[]
}
```

Restoration is idempotent. Emergency restoration accepts no lane/session input
and writes no product state.

## CA-24 Composition And Command Contract

```ts
interface OperatorTuiFactory {
  create(binding: AttachmentBinding, preferences: TuiDisplayPreferences): TuiApplication
}

interface TuiProcessBootstrap {
  plan(argv: readonly string[], environment: NormalizedEnvironment): TuiBootstrapPlan
  execute(plan: TuiBootstrapPlan): Promise<TuiBootstrapResult>
}

interface CoordinatorSessionApplication {
  execute(request: CoordinatorSessionRequest): Promise<CoordinatorSessionResult>
}
```

Commands translate arguments to one request and render the typed result.
`TuiProcessBootstrap` implements the accepted CA-18 strategy, prevents loops,
and is invoked only for interactive TUI entry. It has no session/effect logic.
