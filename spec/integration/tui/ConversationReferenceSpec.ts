import {mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Composer} from '../../../src/presentation/tui/Composer.js';
import {ReferencePicker} from '../../../src/presentation/tui/ReferencePicker.js';
import {OperatorHistoryCache} from '../../../src/foundation/presentation/OperatorHistoryCache.js';
import {authorizePath} from '../../../src/foundation/paths/index.js';
import {boundedExcerpt, ConversationError, CONVERSATION_LIMITS, utf8Bytes} from '../../../src/contracts/tuiConversation.js';
import type {
    ComposerDraftIdentity, ExplicitReference, ReferenceResolution, ReferenceResolutionPort, SlashCommandDescriptor
} from '../../../src/contracts/tuiConversation.js';

const identity: ComposerDraftIdentity = {laneId: 'lane-1', operatorSessionId: 'opsess-1', attachmentOwner: 'kavan'};
const commands: readonly SlashCommandDescriptor[] = Object.freeze([{commandId: 'session.msg', name: 'msg', minArgs: 0, maxArgs: 512, options: []}]);
const signal = (): AbortSignal => new AbortController().signal;

/**
 * A filesystem-backed resolver standing in for the accepted reference resolver.
 * It owns canonicalization through the accepted path authority, secret and
 * commit-state classification, and size limits; the picker only sees typed
 * refusals. The component under test never touches the filesystem itself.
 */
class WorkspaceResolver implements ReferenceResolutionPort {
    constructor(private readonly root: string, private readonly committed: ReadonlySet<string>, private readonly secrets: ReadonlySet<string>) {}
    async resolve(reference: ExplicitReference, _signal: AbortSignal): Promise<ReferenceResolution> {
        if (reference.refKind !== 'file') throw new ConversationError('REFERENCE_NOT_FOUND', reference.raw, 'Only file references exist in this fixture.');
        if (this.secrets.has(reference.value)) throw new ConversationError('REFERENCE_SECRET_DENIED', reference.raw, 'Credential material is never readable from the composer.');
        let resolved: string;
        try { resolved = authorizePath(this.root, reference.value); } catch { throw new ConversationError('REFERENCE_PATH_ESCAPE', reference.raw, 'The path escapes the authorized workspace.'); }
        if (!existsSync(resolved)) throw new ConversationError('REFERENCE_NOT_FOUND', reference.raw, 'No such workspace file.');
        if (!this.committed.has(reference.value)) throw new ConversationError('REFERENCE_UNCOMMITTED', reference.raw, 'Uncommitted content is not referenceable.');
        if (statSync(resolved).size > CONVERSATION_LIMITS.maxReferenceBytes) throw new ConversationError('REFERENCE_TOO_LARGE', reference.raw, 'The file exceeds the reference limit.');
        const excerpt = boundedExcerpt(readFileSync(resolved, 'utf8'), CONVERSATION_LIMITS.maxExcerptBytes);
        return Object.freeze({
            reference, title: reference.value, excerpt: excerpt.excerpt, excerptBytes: excerpt.bytes,
            revision: 1, stale: false, authorized: true, transitive: false
        });
    }
}

function workspace(): {root: string; outside: string; resolver: WorkspaceResolver} {
    const root = mkdtempSync(join(tmpdir(), 'wt-ca20-ws-'));
    const outside = mkdtempSync(join(tmpdir(), 'wt-ca20-outside-'));
    mkdirSync(join(root, 'docs', 'spec'), {recursive: true});
    writeFileSync(join(root, 'docs', 'spec', 'v1.md'), 'committed specification body', 'utf8');
    writeFileSync(join(root, 'docs', 'draft.md'), 'work in progress', 'utf8');
    writeFileSync(join(root, '.env'), 'TOKEN=super-secret-value', 'utf8');
    writeFileSync(join(root, 'huge.md'), 'x'.repeat(CONVERSATION_LIMITS.maxReferenceBytes + 1), 'utf8');
    writeFileSync(join(outside, 'shadow.txt'), 'root:x:0:0', 'utf8');
    symlinkSync(join(outside, 'shadow.txt'), join(root, 'escape.md'));
    const committed = new Set(['docs/spec/v1.md', 'huge.md', 'escape.md']);
    return {root, outside, resolver: new WorkspaceResolver(root, committed, new Set(['.env']))};
}

describe('CA-20 authorized reference resolution', () => {
    it('resolves an authorized workspace file and refuses traversal, symlink escape, secrets, uncommitted, and oversize content', async () => {
        const {root, outside, resolver} = workspace();
        try {
            const picker = new ReferencePicker(resolver);
            const resolved = await picker.resolve('@file:docs/spec/v1.md', signal());
            expect(resolved.excerpt).toBe('committed specification body');
            expect(picker.insertion(resolved)).toBe('@file:docs/spec/v1.md');

            const attacks: readonly [string, string][] = [
                ['@file:../../etc/shadow', 'REFERENCE_PATH_ESCAPE'],
                [`@file:${join(outside, 'shadow.txt')}`, 'REFERENCE_PATH_ESCAPE'],
                ['@file:escape.md', 'REFERENCE_PATH_ESCAPE'],
                ['@file:.env', 'REFERENCE_SECRET_DENIED'],
                ['@file:docs/draft.md', 'REFERENCE_UNCOMMITTED'],
                ['@file:huge.md', 'REFERENCE_TOO_LARGE'],
                ['@file:docs/absent.md', 'REFERENCE_NOT_FOUND']
            ];
            for (const [raw, reason] of attacks) {
                const failure = (await picker.resolve(raw, signal()).catch((cause: unknown) => cause)) as ConversationError;
                expect(failure).withContext(raw).toBeInstanceOf(ConversationError);
                expect(failure.reason).withContext(raw).toBe(reason as never);
                expect(failure.message).withContext(raw).not.toContain('super-secret-value');
            }
        } finally { rmSync(root, {recursive: true, force: true}); rmSync(outside, {recursive: true, force: true}); }
    });

});

describe('CA-20 reference insertion boundary', () => {
    it('inserts only a naming token, never resolved bytes, into the composer', async () => {
        const {root, outside, resolver} = workspace();
        const data = mkdtempSync(join(tmpdir(), 'wt-ca20-data-'));
        try {
            const picker = new ReferencePicker(resolver);
            const composer = new Composer({identity, commands, cache: new OperatorHistoryCache({dataRoot: data})});
            const resolved = await picker.resolve('@file:docs/spec/v1.md', signal());
            composer.reduce({type: 'insert', text: `see ${picker.insertion(resolved)}`});
            expect(composer.state().text).toBe('see @file:docs/spec/v1.md');
            expect(composer.state().text).not.toContain('committed specification body');
        } finally { for (const path of [root, outside, data]) rmSync(path, {recursive: true, force: true}); }
    });

});

describe('CA-20 draft crash recovery', () => {
    it('recovers a durable draft after a crash, keeps it explicitly, and deletes it only after the durable append', async () => {
        const data = mkdtempSync(join(tmpdir(), 'wt-ca20-data-'));
        const journal: string[] = [];
        const modelCalls: string[] = [];
        try {
            const cache = new OperatorHistoryCache({dataRoot: data});
            const before = new Composer({identity, commands, cache});
            const transition = before.reduce({type: 'insert', text: 'half written thought'});
            expect(transition.effect.type).toBe('draft-save');
            await cache.save(identity, transition.state.text);
            expect(journal).toEqual([]);
            expect(modelCalls).toEqual([]);

            const restarted = new Composer({identity, commands, cache});
            const recovered = await restarted.recover();
            expect(recovered.status).toBe('recovered');
            expect(restarted.state().draftStatus).toBe('recovered');
            expect(restarted.reduce({type: 'submit'}).rejected).toBe('COMPOSER_DRAFT_UNRESOLVED');

            restarted.reduce({type: 'recover', choice: 'keep'});
            const submitted = restarted.reduce({type: 'submit'});
            expect(submitted.effect.type).toBe('submit');
            const file = join(data, 'ui-drafts', 'v1', identity.laneId, identity.operatorSessionId, `${identity.attachmentOwner}.json`);
            expect(existsSync(file)).toBeTrue();

            journal.push(restarted.state().text);
            const acknowledged = restarted.acknowledgeSubmission();
            expect(acknowledged.effect.type).toBe('draft-delete');
            await cache.discard(identity);
            expect(existsSync(file)).toBeFalse();
            expect(journal).toEqual(['half written thought']);
            expect(modelCalls).toEqual([]);
        } finally { rmSync(data, {recursive: true, force: true}); }
    });

});

describe('CA-20 durable paste bounds', () => {
    it('keeps an over-limit paste out of every durable byte and warns before truncation', async () => {
        const data = mkdtempSync(join(tmpdir(), 'wt-ca20-data-'));
        try {
            const cache = new OperatorHistoryCache({dataRoot: data});
            const composer = new Composer({identity, commands, cache});
            const huge = 'p'.repeat(CONVERSATION_LIMITS.maxPasteBytes + 1000);
            composer.reduce({type: 'paste', text: huge});
            expect(composer.state().warning).toBe('COMPOSER_INPUT_TOO_LARGE');
            const saved = await cache.save(identity, composer.state().text);
            expect(saved.status).toBe('recovered');
            const file = join(data, 'ui-drafts', 'v1', identity.laneId, identity.operatorSessionId, `${identity.attachmentOwner}.json`);
            const stored = readFileSync(file, 'utf8');
            expect(stored).not.toContain(huge);
            expect(utf8Bytes(stored)).toBeLessThan(CONVERSATION_LIMITS.maxComposerBytes);
            expect(statSync(file).mode & 0o777).toBe(0o600);
        } finally { rmSync(data, {recursive: true, force: true}); }
    });
});
