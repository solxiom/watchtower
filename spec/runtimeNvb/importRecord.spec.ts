import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    AuditError, expectedPaths, importedPath, normalizeTrailingWhitespace,
    parseAuditRecord, readAudit, readSourceBlob, recordPath, sha256, snapshotAuditBytes,
    transformId, verifySourceBlob
} from './ImportRecordSupport.js';

function recordText(): string {
    return readFileSync(recordPath, 'utf8');
}

function mutated(change: (record: Record<string, unknown>) => void): string {
    const record = JSON.parse(recordText()) as Record<string, unknown>;
    change(record);
    return JSON.stringify(record);
}

function expectCode(code: string, change: (record: Record<string, unknown>) => void): void {
    expect(() => parseAuditRecord(mutated(change))).toThrowError(AuditError, code);
}

describe('RT-01 runtime and knowledge import record', () => {
    it('has the closed 30-script and 24-document source inventory', () => {
        const record = readAudit();
        const paths = [...record.knowledgeImports, ...record.referenceOnlyDocuments, ...record.laneOwnedTemplateDocuments, ...Object.keys(record.scripts)];
        expect(paths.sort()).toEqual([...expectedPaths].sort());
        expect(Object.keys(record.sourceBlobSha1).sort()).toEqual([...expectedPaths].sort());
        expect(Object.values(record.scripts).filter((decision) => decision.classification === 'temporary-wrapper')).toHaveSize(7);
    });

    it('reproduces every Git blob and each imported knowledge output', () => {
        const record = readAudit();
        expectedPaths.forEach((path) => verifySourceBlob(record, path));
        let transforms = 0;
        record.knowledgeImports.forEach((path) => {
            const normalization = record.normalizedKnowledgeImports[path];
            const source = verifySourceBlob(record, path);
            const result = normalization ? normalizeTrailingWhitespace(source) : {bytes: source, occurrences: 0};
            const output = readFileSync(join(process.cwd(), importedPath(path)));
            expect(result.bytes).withContext(path).toEqual(output);
            expect(sha256(output)).toBe(record.knowledgeOutputSha256[path]);
            expect(normalizeTrailingWhitespace(output).occurrences).toBe(0);
            if (normalization) {
                transforms += result.occurrences;
                expect(normalization.transformId).toBe(transformId);
                expect(result.occurrences).toBe(normalization.occurrences);
            }
        });
        expect(transforms).toBe(6);
    });

    it('rejects missing, extra, empty, corrupt, and unsupported values before source access', () => {
        expect(() => parseAuditRecord('{')).toThrowError(AuditError, 'AUDIT_JSON_INVALID');
        expectCode('AUDIT_VERSION_INVALID', (record) => delete record.recordVersion);
        expectCode('AUDIT_FIELD_UNSUPPORTED', (record) => record.unexpected = true);
        expectCode('AUDIT_SCRIPT_INVALID', (record) => (record.scripts as Record<string, Record<string, unknown>>)['bin/init-lane.sh'].unexpected = true);
        expectCode('AUDIT_TEMPORARY_INVALID', (record) => (record.scripts as Record<string, Record<string, unknown>>)['template/coordinator/coordinator-alert.sh'].expiry = '');
        expectCode('AUDIT_EXPIRY_INVALID', (record) => (record.scripts as Record<string, Record<string, unknown>>)['template/coordinator/coordinator-alert.sh'].expiry = 'later');
        expectCode('AUDIT_EXPIRY_INVALID', (record) => (record.scripts as Record<string, Record<string, unknown>>)['template/coordinator/coordinator-alert.sh'].expiry = 'CA-13 acceptance');
        expectCode('AUDIT_OWNER_INVALID', (record) => {
            (record.scripts as Record<string, Record<string, unknown>>)['bin/init-lane.sh'].laterOwner = 'RT-07';
        });
        expectCode('AUDIT_NEXT_OWNER_INVALID', (record) => delete (record.nextOwner as Record<string, unknown>)['RT-10']);
        expectCode('AUDIT_NORMALIZATIONS_INVALID', (record) => {
            const normalizations = record.normalizedKnowledgeImports as Record<string, Record<string, unknown>>;
            normalizations['docs/playbook.md'].transformId = 'unknown/v1';
        });
        expectCode('AUDIT_NORMALIZATIONS_INVALID', (record) => delete (record.normalizedKnowledgeImports as Record<string, unknown>)['docs/playbook.md']);
        expectCode('AUDIT_PROVENANCE_INVALID', (record) => (record.source as Record<string, unknown>).readMethod = 'working tree');
        expectCode('AUDIT_OUTPUTS_INVALID', (record) => (record.knowledgeOutputSha256 as Record<string, unknown>)['AGENTS.md'] = 'sha256:bad');
    });

    it('fails closed for corrupt source identity and unavailable Git object access', () => {
        const corrupt = parseAuditRecord(recordText().replace('45e753fa06cd7ac642f4c9b55bed5ef292453316', '0000000000000000000000000000000000000000'));
        expect(() => verifySourceBlob(corrupt, 'AGENTS.md')).toThrowError(AuditError, 'AUDIT_SOURCE_BLOB_MISMATCH');
        expect(() => readSourceBlob('AGENTS.md', '/not/a/repository')).toThrowError(AuditError, 'AUDIT_SOURCE_UNAVAILABLE');
    });

    it('leaves the record and imported knowledge bytes unchanged on audit paths', () => {
        const before = snapshotAuditBytes();
        const record = readAudit();
        verifySourceBlob(record, 'AGENTS.md');
        expect(() => readSourceBlob('AGENTS.md', '/not/a/repository')).toThrowError(AuditError, 'AUDIT_SOURCE_UNAVAILABLE');
        expect(snapshotAuditBytes()).toEqual(before);
    });
});
