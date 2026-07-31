import {
    SHIPPING_BUSY_TIMEOUT_MS,
    SHIPPING_FILE_MODE,
    SHIPPING_JOURNAL_MODE,
    createSqliteConfig
} from '../../src/foundation/storage/index.js';
import {WatchtowerError} from '../../src/contracts/index.js';

function expectInvalidArgument(construct: () => unknown): void {
    try {
        construct();
        fail('expected createSqliteConfig to reject the input');
    } catch (error) {
        expect(error).toBeInstanceOf(WatchtowerError);
        expect((error as WatchtowerError).code).toBe('ERR_INVALID_ARGUMENT');
    }
}

describe('createSqliteConfig', function () {
    it('applies the v1-contracts §8A.4 shipping defaults', function () {
        const config = createSqliteConfig();
        expect(config.journalMode).toBe(SHIPPING_JOURNAL_MODE);
        expect(config.journalMode).toBe('wal');
        expect(config.busyTimeoutMs).toBe(SHIPPING_BUSY_TIMEOUT_MS);
        expect(config.busyTimeoutMs).toBe(5000);
        expect(config.foreignKeys).toBeTrue();
        expect(config.allowExtensions).toBeFalse();
        expect(config.fileMode).toBe(SHIPPING_FILE_MODE);
        expect(config.fileMode).toBe(0o600);
        expect(config.readOnly).toBeFalse();
    });

    it('freezes the constructed configuration', function () {
        const config = createSqliteConfig();
        expect(Object.isFrozen(config)).toBeTrue();
    });

    it('accepts bounded overrides for busy timeout, file mode, and read-only', function () {
        const config = createSqliteConfig({busyTimeoutMs: 0, fileMode: 0o400, readOnly: true});
        expect(config.busyTimeoutMs).toBe(0);
        expect(config.fileMode).toBe(0o400);
        expect(config.readOnly).toBeTrue();
        expect(config.foreignKeys).toBeTrue();
        expect(config.allowExtensions).toBeFalse();
    });

    it('rejects overrides that weaken non-negotiable storage invariants', function () {
        expectInvalidArgument(() => createSqliteConfig({foreignKeys: false}));
        expectInvalidArgument(() => createSqliteConfig({allowExtensions: true}));
        expectInvalidArgument(() => createSqliteConfig({journalMode: 'delete'}));
    });

    it('rejects group- or other-accessible file modes', function () {
        expectInvalidArgument(() => createSqliteConfig({fileMode: 0o640}));
        expectInvalidArgument(() => createSqliteConfig({fileMode: 0o604}));
        expectInvalidArgument(() => createSqliteConfig({fileMode: 0o666}));
    });

    it('rejects malformed busy timeouts and non-object overrides', function () {
        expectInvalidArgument(() => createSqliteConfig({busyTimeoutMs: -1}));
        expectInvalidArgument(() => createSqliteConfig({busyTimeoutMs: 1.5}));
        expectInvalidArgument(() => createSqliteConfig({busyTimeoutMs: 10 ** 9}));
        expectInvalidArgument(() => createSqliteConfig([] as never));
    });

    it('maps invalid configuration to the EXIT_INVALID_INPUT exit code', function () {
        try {
            createSqliteConfig({foreignKeys: false});
            fail('expected a WatchtowerError');
        } catch (error) {
            expect((error as WatchtowerError).exitCode).toBe(2);
        }
    });
});
