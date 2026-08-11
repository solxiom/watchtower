import {
    OperatorSessionAmendmentService, OperatorSessionApplyService, OperatorSessionCompactionService,
    OperatorSessionEntryService, OperatorSessionLifecycleService, OperatorSessionReadService,
    interactiveTerminal, type PreparedAttachmentResult, type SessionCommandQuery
} from '../../../foundation/lane/index.js';
import type {SessionCommandResult} from '../../../contracts/sessionCommand.js';
import {TuiAttachmentController} from '../../../presentation/tui/index.js';
import type {SessionCommandOptions} from './sessionCommandOptions.js';

/**
 * The `wt coordinator session`/`ask` front door (CA-24).
 *
 * It resolves one accepted owner per parsed form and returns that owner's
 * typed result. It contains no session policy, no lifecycle rule, and no
 * projection: the only behavior it adds is opening CA-22's attachment state
 * machine over CA-24's durable port once entry has already been authorized —
 * which is the integration this batch owns.
 */
export interface SessionCommandServices {
    readonly reads: OperatorSessionReadService;
    readonly lifecycle: OperatorSessionLifecycleService;
    readonly entry: OperatorSessionEntryService;
    readonly amendment: OperatorSessionAmendmentService;
    readonly apply: OperatorSessionApplyService;
    readonly compaction: OperatorSessionCompactionService;
}

export function defaultSessionCommandServices(): SessionCommandServices {
    return {
        reads: new OperatorSessionReadService(), lifecycle: new OperatorSessionLifecycleService(),
        entry: new OperatorSessionEntryService(), amendment: new OperatorSessionAmendmentService(),
        apply: new OperatorSessionApplyService(), compaction: new OperatorSessionCompactionService()
    };
}

export class SessionCommandFront {
    constructor(
        private readonly services: SessionCommandServices = defaultSessionCommandServices(),
        private readonly interactive: () => boolean = interactiveTerminal
    ) {}

    async run(query: SessionCommandQuery, options: SessionCommandOptions): Promise<SessionCommandResult> {
        const subject = options.subject ?? '';
        switch (options.form) {
            case 'list': return this.services.reads.list(query);
            case 'show': return this.services.reads.show(query, subject);
            case 'history': return this.services.reads.history(query, subject);
            case 'export': return this.services.reads.export(query, subject, options.since);
            case 'budget': return this.services.reads.budget(query, subject);
            case 'proposals': return this.services.reads.proposals(query, subject);
            case 'suspend': case 'resume': case 'close':
                return this.services.lifecycle.transition(query, options.form, subject, options.dryRun);
            case 'fork':
                return this.services.lifecycle.fork(query, subject, forkParams(options), options.dryRun);
            case 'pin': case 'unpin':
                return this.services.lifecycle.pin(query, options.form, subject, options.second ?? '', options.dryRun);
            case 'prune': return this.services.lifecycle.prune(query, subject, options.dryRun);
            case 'compact': return this.services.compaction.compact(query, subject, options.dryRun);
            case 'apply': return this.services.apply.apply(query, subject, options.second ?? '', options.dryRun);
            case 'amendment': return this.amendment(query, options);
            case 'ask':
                return this.services.entry.ask(query, {
                    question: options.question ?? '', operatorSessionId: options.session ?? '',
                    ...(options.queryForm === undefined ? {} : {queryFormId: options.queryForm})
                });
            case 'create':
                return this.attach(this.services.entry.create(query, this.entryRequest(options)), 'create');
            default:
                return this.attach(this.services.entry.attach(query, subject, this.entryRequest(options)), 'attach');
        }
    }

    private amendment(query: SessionCommandQuery, options: SessionCommandOptions): SessionCommandResult {
        const subject = options.subject ?? '';
        if (options.amendment === 'list') return this.services.amendment.list(query, null);
        if (options.amendment === 'admit') return this.services.amendment.admit(query, subject, options.dryRun);
        return this.services.amendment.request(
            query, subject, {packId: options.pack ?? '', reason: options.reason ?? ''}, options.dryRun
        );
    }

    /**
     * Opens CA-22's attachment state machine over CA-24's durable port. The
     * controller — never this command — owns the state transition, and the
     * settled state is reported rather than interpreted.
     */
    private async attach(prepared: PreparedAttachmentResult, action: 'create' | 'attach'): Promise<SessionCommandResult> {
        if (!prepared.ok) return prepared;
        const controller = new TuiAttachmentController({port: prepared.prepared.port});
        const opened = await controller.start(prepared.prepared.binding, new AbortController().signal);
        return {
            ok: true,
            data: {
                schemaVersion: 1, action, laneId: prepared.prepared.laneId,
                operatorSessionId: prepared.prepared.operatorSessionId, dryRun: false,
                applied: prepared.prepared.created, detail: null,
                result: {
                    attachmentId: opened.binding.attachmentId, state: opened.state, role: opened.binding.role,
                    stream: opened.binding.stream, revision: opened.revision, createdSession: opened.createdSession
                }
            }
        };
    }

    private entryRequest(options: SessionCommandOptions) {
        return {
            topic: options.topic ?? '', observe: options.observe, stream: options.stream,
            waitForActiveTurn: options.waitForActiveTurn, interactive: this.interactive(),
            ...(options.policyProfile === undefined ? {} : {policyProfileId: options.policyProfile}),
            tags: options.tags
        };
    }
}

function forkParams(options: SessionCommandOptions): {readonly topic?: string; readonly policyProfileId?: string} {
    return {
        ...(options.topic === undefined ? {} : {topic: options.topic}),
        ...(options.policyProfile === undefined ? {} : {policyProfileId: options.policyProfile})
    };
}
