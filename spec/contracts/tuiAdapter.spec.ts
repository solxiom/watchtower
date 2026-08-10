import {PROMOTED_TUI_NATIVE_INTEGRITY, TUI_ADAPTER_CONTRACT_REVISION, TUI_ENGINE_PACKAGES, validateTuiFeasibilityDecision} from '../../src/contracts/index.js';

const valid = () => ({
    verdict: 'PASS', nodeRange: '>=26.4.0', bootstrap: 'posix-execve',
    adapterContractRevision: TUI_ADAPTER_CONTRACT_REVISION,
    enginePackages: TUI_ENGINE_PACKAGES.map((item) => ({...item})),
    supportedTargets: [{os: 'linux', cpu: 'x86_64', libc: 'glibc', nativePackage: '@opentui/core-linux-x64', artifactIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY}],
    evidenceRefs: ['TUI-EXP-01-outcome.md', 'TUI-EXP-01-r6/bootstrap-matrix.md']
});

describe('CA-18 TUI adapter contract', () => {
    it('accepts the promoted exact engine and target evidence', () => {
        const result = validateTuiFeasibilityDecision(valid());
        expect(result.ok).toBeTrue();
        if (result.ok) expect(Object.isFrozen(result.value)).toBeTrue();
    });

    it('rejects unaccepted renderer substitutions and target identities', () => {
        const input = valid();
        const substitution: unknown = {...input, enginePackages: [
            {...input.enginePackages[0], name: '@other/renderer'}, input.enginePackages[1]
        ]};
        const wrongTarget: unknown = {...input, supportedTargets: [{...input.supportedTargets[0], os: 'darwin', cpu: 'arm64', libc: undefined, nativePackage: '@evil/native'}]};
        expect(validateTuiFeasibilityDecision(substitution).ok).toBeFalse();
        expect(validateTuiFeasibilityDecision(wrongTarget).ok).toBeFalse();
    });

    it('rejects malformed, duplicate, missing, and forged evidence', () => {
        const input = valid();
        const cases = [null, {...valid(), extra: true}, {...valid(), evidenceRefs: []}, {...valid(), supportedTargets: []},
            {...valid(), enginePackages: [{...valid().enginePackages[0], integrity: 'sha512-' + 'A'.repeat(86) + '=='}, valid().enginePackages[1]]},
            {...valid(), evidenceRefs: [input.evidenceRefs[0], input.evidenceRefs[0]]},
            {...valid(), supportedTargets: [input.supportedTargets[0], {...input.supportedTargets[0]}]},
            {...valid(), supportedTargets: [{...valid().supportedTargets[0], artifactIntegrity: 'sha256:forged'}]}];
        cases.forEach((value) => expect(validateTuiFeasibilityDecision(value).ok).toBeFalse());
    });
});
