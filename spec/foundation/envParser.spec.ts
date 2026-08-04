import {existsSync} from 'node:fs';
import {parseEnvConfig, redactSensitiveKeys} from '../../src/foundation/parsing/index.js';

const maliciousValues = [
    '$(touch /tmp/watchtower-pwned)', '`touch /tmp/watchtower-pwned`', '${HOME}', '$HOME',
    'safe&&touch', 'safe||touch', 'safe|touch', 'safe;touch', 'safe&touch', 'safe>file',
    'safe>>file', 'safe<file', '$(echo nested $(id))', '"$(id)"', "'$(id)'", '"${HOME}"',
    "'$HOME'", '$(<file)', '`id`', 'value; # comment', 'value && id', 'value || id',
    'value | id', 'value &', 'value > out', 'value >> out', 'value < in', '$(printf x)',
    '${PATH:-fallback}', '$1', 'value $(id)', 'value`id`', 'value ${IFS}', '<<EOF',
    'unquoted value', '"unclosed', "'unclosed", 'foo\\bar', '~root', '()', '\\u0024HOME'
];

describe('strict environment parser', function () {
    it('accepts canonical keys, comments, and quoted scalar values exactly', function () {
        const result = parseEnvConfig([
            '# lane settings', '', 'LANE_ID=', 'LANE_SLUG="my lane"', "INITIATIVE_ID='feature'",
            'HOME_REPOSITORY_ID=main', 'WORKSPACE=/work/main', 'TMUX_PREFIX=wt', 'IMPL_PACK_REL=docs/pack'
        ].join('\n'));
        expect(result.valid).toBeTrue();
        expect(result.errors).toEqual([]);
        expect(result.config).toEqual({LANE_ID: '', LANE_SLUG: 'my lane', INITIATIVE_ID: 'feature', HOME_REPOSITORY_ID: 'main', WORKSPACE: '/work/main', TMUX_PREFIX: 'wt', IMPL_PACK_REL: 'docs/pack'});
    });

    it('rejects every malicious fixture without evaluating its bytes and retains line diagnostics', function () {
        const sentinel = `/tmp/wt-rm04-parser-sentinel-${process.pid}`;
        expect(existsSync(sentinel)).toBeFalse();
        maliciousValues.forEach((value, index) => {
            const result = parseEnvConfig(`SAFE=value\nATTACK=${value}`);
            expect(result.valid).withContext(value).toBeFalse();
            expect(result.errors.some((error) => error.line === 2)).withContext(value).toBeTrue();
        });
        expect(maliciousValues.length).toBeGreaterThanOrEqual(30);
        expect(existsSync(sentinel)).toBeFalse();
    });

    it('rejects continuation and duplicate records while retaining the first safe value', function () {
        const continuation = parseEnvConfig('VALUE=foo\\\nNEXT=bar');
        expect(continuation.errors).toContain(jasmine.objectContaining({line: 1, code: 'unsafe-shell-syntax'}));
        const duplicate = parseEnvConfig('VALUE=first\nVALUE=second');
        expect(duplicate.config).toEqual({VALUE: 'first'});
        expect(duplicate.errors).toContain(jasmine.objectContaining({line: 2, code: 'duplicate-key'}));
    });

    it('rejects embedded CR variants on their originating physical records', function () {
        const result = parseEnvConfig('VALUE=foo\\\rNEXT=bar');
        expect(result.errors).toContain(jasmine.objectContaining({line: 1, code: 'unsafe-shell-syntax'}));
    });

    it('rejects base64-constructed NUL values before they enter parser output', function () {
        ['VkFMVUU9ImEAYiI=', 'VkFMVUU9J2EAYic='].forEach((fixture) => {
            const result = parseEnvConfig(Buffer.from(fixture, 'base64').toString('utf8'));
            expect(result.errors).toContain(jasmine.objectContaining({line: 1, code: 'unsafe-shell-syntax'}));
            expect(result.config).toEqual({});
            expect(result.unknownKeys).toEqual({});
        });
    });

    it('preserves unknown keys in both config and diagnostics', function () {
        const result = parseEnvConfig('FUTURE_SETTING=value');
        expect(result.valid).toBeTrue();
        expect(result.config.FUTURE_SETTING).toBe('value');
        expect(result.unknownKeys).toEqual({FUTURE_SETTING: 'value'});
        expect(result.warnings[0]).toEqual(jasmine.objectContaining({line: 1, code: 'unknown-key', key: 'FUTURE_SETTING'}));
    });

    it('redacts every sensitive key match without changing safe values', function () {
        const result = redactSensitiveKeys({TOKEN_VALUE: 'a', CLIENT_SECRET: 'b', USER_PASSWORD: 'c', PUBLIC_KEY: 'd', credentialId: 'e', LANE_SLUG: 'safe'});
        expect(result.redactedKeys).toEqual(['TOKEN_VALUE', 'CLIENT_SECRET', 'USER_PASSWORD', 'PUBLIC_KEY', 'credentialId']);
        expect(result.redacted.LANE_SLUG).toBe('safe');
        expect(Object.values(result.redacted).filter((value) => value === '[REDACTED]').length).toBe(5);
    });
});
