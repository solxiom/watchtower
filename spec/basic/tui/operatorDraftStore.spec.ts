import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OperatorDraftStore} from '../../../src/foundation/presentation/OperatorDraftStore.js';
import type {ComposerDraftIdentity} from '../../../src/contracts/tuiConversation.js';

const identity: ComposerDraftIdentity = {laneId: 'lane-1', operatorSessionId: 'opsess-1', attachmentOwner: 'kavan'};
const draftsRoot = (root: string): string => join(root, 'ui-drafts', 'v1');
const draftFile = (root: string, session = identity.operatorSessionId, owner = identity.attachmentOwner, lane = identity.laneId): string => join(draftsRoot(root), lane, session, `${owner}.json`);
const temporaryRoot = (): string => mkdtempSync(join(tmpdir(), 'wt-ca20-'));

describe('CA-20 durable draft store', () => {
    it('writes one owner-only draft per identity with a checksum and the exact stored fields', async () => {
        const root = temporaryRoot();
        try {
            const store = new OperatorDraftStore({dataRoot: root});
            expect((await store.save(identity, 'unsent words')).status).toBe('recovered');
            const file = draftFile(root);
            const stored: unknown = JSON.parse(readFileSync(file, 'utf8'));
            expect(Object.keys(stored as object).sort()).toEqual(['attachmentOwner', 'byteLength', 'checksum', 'laneId', 'operatorSessionId', 'schemaVersion', 'text', 'updatedAt']);
            expect((stored as {byteLength: number}).byteLength).toBe(12);
            expect((stored as {checksum: string}).checksum.startsWith('sha256:')).toBeTrue();
            expect(statSync(file).mode & 0o777).toBe(0o600);
            expect(statSync(join(draftsRoot(root), identity.laneId)).mode & 0o777).toBe(0o700);
            expect(statSync(join(draftsRoot(root), identity.laneId, identity.operatorSessionId)).mode & 0o777).toBe(0o700);
            const loaded = await store.load(identity);
            expect(loaded.status).toBe('recovered');
            expect(loaded.record?.text).toBe('unsent words');
            expect(readdirSync(join(draftsRoot(root), identity.laneId, identity.operatorSessionId))).toEqual(['kavan.json']);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('refuses a symlinked lane directory or draft file so no write leaves the authorized root', async () => {
        const root = temporaryRoot();
        const outside = temporaryRoot();
        try {
            mkdirSync(draftsRoot(root), {recursive: true});
            symlinkSync(outside, join(draftsRoot(root), identity.laneId));
            const store = new OperatorDraftStore({dataRoot: root});
            const refused = await store.save(identity, 'redirect me');
            expect(refused.status).toBe('quarantined');
            expect(refused.reason).toBe('DRAFT_IDENTITY_MISMATCH');
            expect(readdirSync(outside)).toEqual([]);
            expect((await store.load(identity)).status).toBe('quarantined');

            const second = temporaryRoot();
            const target = join(second, 'evil.json');
            writeFileSync(target, '{}', 'utf8');
            const clean = temporaryRoot();
            mkdirSync(join(draftsRoot(clean), identity.laneId, identity.operatorSessionId), {recursive: true});
            symlinkSync(target, draftFile(clean));
            const linked = new OperatorDraftStore({dataRoot: clean});
            expect((await linked.save(identity, 'redirect me')).status).toBe('quarantined');
            expect(readFileSync(target, 'utf8')).toBe('{}');
            rmSync(second, {recursive: true, force: true});
            rmSync(clean, {recursive: true, force: true});
        } finally { rmSync(root, {recursive: true, force: true}); rmSync(outside, {recursive: true, force: true}); }
    });

    it('keeps one draft per attachment owner so no owner overwrites another', async () => {
        const root = temporaryRoot();
        try {
            const store = new OperatorDraftStore({dataRoot: root});
            const other = {...identity, attachmentOwner: 'second-owner'};
            await store.save(identity, 'mine');
            await store.save(other, 'theirs');
            expect((await store.load(identity)).record?.text).toBe('mine');
            expect((await store.load(other)).record?.text).toBe('theirs');
            expect(readdirSync(join(draftsRoot(root), identity.laneId, identity.operatorSessionId)).sort()).toEqual(['kavan.json', 'second-owner.json']);
            await store.discard(other);
            expect((await store.load(identity)).record?.text).toBe('mine');
            expect((await store.load(other)).status).toBe('none');
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('refuses a symlinked or non-directory configured data root before anything below it', async () => {
        const real = temporaryRoot();
        const outside = temporaryRoot();
        try {
            const linkedRoot = join(real, 'linked-data-root');
            symlinkSync(outside, linkedRoot);
            const store = new OperatorDraftStore({dataRoot: linkedRoot});
            expect((await store.save(identity, 'redirect me')).status).toBe('quarantined');
            expect((await store.load(identity)).status).toBe('quarantined');
            expect(existsSync(join(outside, 'ui-drafts'))).toBeFalse();
            expect(readdirSync(outside)).toEqual([]);
            expect((await store.count())).toBe(0);

            const asFile = join(real, 'data-root-file');
            writeFileSync(asFile, 'not a directory', 'utf8');
            const fileRooted = new OperatorDraftStore({dataRoot: asFile});
            expect((await fileRooted.save(identity, 'redirect me')).status).toBe('quarantined');
            expect(readFileSync(asFile, 'utf8')).toBe('not a directory');

            const missing = new OperatorDraftStore({dataRoot: join(real, 'absent-root')});
            expect((await missing.save(identity, 'redirect me')).status).toBe('quarantined');
            expect(existsSync(join(real, 'absent-root'))).toBeFalse();
        } finally { rmSync(real, {recursive: true, force: true}); rmSync(outside, {recursive: true, force: true}); }
    });

    it('refuses a symlinked ui-drafts or v1 root before any component beneath it', async () => {
        for (const link of ['ui-drafts', join('ui-drafts', 'v1')]) {
            const root = temporaryRoot();
            const outside = temporaryRoot();
            try {
                if (link !== 'ui-drafts') mkdirSync(join(root, 'ui-drafts'), {recursive: true});
                symlinkSync(outside, join(root, link));
                const store = new OperatorDraftStore({dataRoot: root});
                expect((await store.save(identity, 'redirect me')).status).withContext(link).toBe('quarantined');
                expect((await store.load(identity)).status).withContext(link).toBe('quarantined');
                expect(readdirSync(outside)).withContext(link).toEqual([]);
            } finally { rmSync(root, {recursive: true, force: true}); rmSync(outside, {recursive: true, force: true}); }
        }
    });

    it('serializes discard and purge with in-flight writes', async () => {
        const root = temporaryRoot();
        try {
            const store = new OperatorDraftStore({dataRoot: root});
            await store.save(identity, 'first');
            const writing = store.save(identity, 'second');
            const discarding = store.discard(identity);
            await Promise.all([writing, discarding]);
            expect((await store.load(identity)).status).toBe('none');
            expect(existsSync(draftFile(root))).toBeFalse();

            await store.save(identity, 'third');
            await Promise.all([store.save(identity, 'fourth'), store.purgeLane(identity.laneId)]);
            expect((await store.count())).toBe(0);
            expect((await store.prune()).temporaryRemoved).toBe(0);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('treats a NaN or negative lowered limit as the hard maximum rather than an unbounded store', async () => {
        const root = temporaryRoot();
        try {
            const store = new OperatorDraftStore({dataRoot: root, maxDrafts: Number.NaN, ttlMs: -1});
            for (let index = 0; index < 20; index += 1) await store.save({...identity, operatorSessionId: `opsess-${index}`}, `draft ${index}`);
            expect((await store.save({...identity, operatorSessionId: 'opsess-new'}, 'overflow')).reason).toBe('DRAFT_LIMIT_REACHED');
            expect((await store.count())).toBe(20);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('quarantines a foreign identity, corrupt bytes, a tampered checksum, and a traversal segment', async () => {
        const root = temporaryRoot();
        try {
            const store = new OperatorDraftStore({dataRoot: root});
            await store.save(identity, 'mine');
            const foreign = await store.load({...identity, attachmentOwner: 'someone-else'});
            expect(foreign.status).toBe('none');
            expect(foreign.record).toBeNull();

            const planted = {schemaVersion: 1, ...identity, attachmentOwner: 'someone-else', text: 'planted',
                updatedAt: new Date().toISOString(), byteLength: 7, checksum: 'sha256:x'};
            writeFileSync(draftFile(root, identity.operatorSessionId, 'someone-else'), JSON.stringify(planted), 'utf8');
            const quarantined = await store.load({...identity, attachmentOwner: 'someone-else'});
            expect(quarantined.status).toBe('quarantined');
            expect(quarantined.record).toBeNull();

            writeFileSync(draftFile(root), '{not json', 'utf8');
            expect((await store.load(identity)).reason).toBe('DRAFT_CORRUPT');
            const tampered = {schemaVersion: 1, ...identity, text: 'edited', updatedAt: new Date().toISOString(), byteLength: 6, checksum: 'sha256:wrong'};
            writeFileSync(draftFile(root), JSON.stringify(tampered), 'utf8');
            expect((await store.load(identity)).reason).toBe('DRAFT_CORRUPT');

            expect((await store.load({...identity, operatorSessionId: '../../escape'})).status).toBe('quarantined');
            expect((await store.save({...identity, laneId: '..'}, 'x')).status).toBe('quarantined');
            expect(existsSync(join(root, 'escape.json'))).toBeFalse();
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('serializes concurrent writes and leaves no temporary behind', async () => {
        const root = temporaryRoot();
        try {
            const store = new OperatorDraftStore({dataRoot: root});
            const results = await Promise.all(['one', 'two', 'three', 'four', 'five'].map((text) => store.save(identity, text)));
            expect(results.every((result) => result.status === 'recovered')).toBeTrue();
            const files = readdirSync(join(draftsRoot(root), identity.laneId, identity.operatorSessionId));
            expect(files).toEqual(['kavan.json']);
            const stored = await store.load(identity);
            expect(['one', 'two', 'three', 'four', 'five']).toContain(stored.record?.text as string);
            expect((await store.prune()).temporaryRemoved).toBe(0);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('expires drafts after seven days and removes abandoned atomic-write temporaries at startup', async () => {
        const root = temporaryRoot();
        try {
            let now = Date.parse('2026-08-01T00:00:00.000Z');
            const store = new OperatorDraftStore({dataRoot: root, clock: () => new Date(now)});
            await store.save(identity, 'old text');
            writeFileSync(`${draftFile(root)}.tmp-123-456`, 'partial', 'utf8');

            now += 8 * 24 * 60 * 60 * 1000;
            const expired = await store.load(identity);
            expect(expired.status).toBe('none');
            expect(expired.reason).toBe('DRAFT_EXPIRED');
            expect(existsSync(draftFile(root))).toBeFalse();

            const pruned = await store.prune();
            expect(pruned.temporaryRemoved).toBe(1);
            expect(existsSync(`${draftFile(root)}.tmp-123-456`)).toBeFalse();
            expect(pruned.blocked).toBeFalse();
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('keeps at most twenty drafts, prunes expired ones first, and never silently evicts a live draft', async () => {
        const root = temporaryRoot();
        try {
            let now = Date.parse('2026-08-01T00:00:00.000Z');
            const store = new OperatorDraftStore({dataRoot: root, clock: () => new Date(now)});
            for (let index = 0; index < 20; index += 1) await store.save({...identity, operatorSessionId: `opsess-${index}`}, `draft ${index}`);
            const blocked = await store.save({...identity, operatorSessionId: 'opsess-new'}, 'overflow');
            expect(blocked.reason).toBe('DRAFT_LIMIT_REACHED');
            expect(existsSync(draftFile(root, 'opsess-new'))).toBeFalse();
            expect((await store.load({...identity, operatorSessionId: 'opsess-0'})).record?.text).toBe('draft 0');
            expect((await store.save({...identity, operatorSessionId: 'opsess-3'}, 'updated in place')).status).toBe('recovered');

            now += 8 * 24 * 60 * 60 * 1000;
            expect((await store.save({...identity, operatorSessionId: 'opsess-new'}, 'now there is room')).status).toBe('recovered');
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('refuses over-limit text and writes nothing durable when recovery is disabled', async () => {
        const root = temporaryRoot();
        try {
            const store = new OperatorDraftStore({dataRoot: root});
            expect((await store.save(identity, 'z'.repeat(32769))).reason).toBe('COMPOSER_INPUT_TOO_LARGE');
            expect(existsSync(draftFile(root))).toBeFalse();

            const off = new OperatorDraftStore({dataRoot: root, recovery: 'off'});
            expect((await off.save(identity, 'never durable')).status).toBe('disabled');
            expect((await off.load(identity)).reason).toBe('DRAFT_DISABLED');
            expect(existsSync(draftFile(root))).toBeFalse();
        } finally { rmSync(root, {recursive: true, force: true}); }
    });
});
