import type {RepositoryBinding} from '../../src/contracts/types.js';
import type {WatchtowerError} from '../../src/contracts/errors.js';
import type {CoordinatorRoutingPolicy, InitConflict, InitRequest} from '../../src/foundation/InitContracts.js';
import type {InitPreflightPort, ScopeReadResult} from '../../src/foundation/InitPorts.js';
import {InitPlanner, validateInitRequest} from '../../src/foundation/InitPlanner.js';
import {validateRoutingPolicy} from '../../src/foundation/InitRoutingValidator.js';

describe('InitPlanner corrected contract', function () {
    it('builds the bounded no-effect plan and explicitly defers later-batch authority', function () {
        const plan = planner().buildInitPlan(request());
        expect(plan.applied).toBeFalse();
        expect(plan.implementationPack).toEqual({repository: 'control-home', path: 'pack', absolutePath: '/repo/pack'});
        expect(plan.conflictCheck).toEqual({complete: true, conflicts: []});
        expect(plan.routing.operatorSessionClasses.D3).toEqual({primary: 'high', fallbacks: []});
        expect(plan.routingProvenance.reserves).toContain('complex-escalation');
        expect(plan.indexEntries).toEqual([{repository: 'control-home', worktreePath: '/repo'}]);
        expect(plan.deferred.map(item => item.owner)).toEqual(['LC-02', 'LC-03', 'LC-05', 'LC-09']);
    });

    it('enforces every slug and prefix boundary', function () {
        for (const slug of ['a', 'abcd', 'a'.repeat(63)]) expect(validateInitRequest({...request(), slug}).slug).toBe(slug);
        for (const slug of ['', '-a', 'A', 'é', 'a'.repeat(64), 'a'.repeat(100)]) expectCode(() => validateInitRequest({...request(), slug}), 'ERR_INVALID_ARGUMENT');
        for (const tmuxPrefix of ['a', 'abcd', 'a'.repeat(16)]) expect(validateInitRequest({...request(), tmuxPrefix}).tmuxPrefix).toBe(tmuxPrefix);
        for (const tmuxPrefix of ['', '-a', 'A', 'é', 'a'.repeat(17)]) expectCode(() => validateInitRequest({...request(), tmuxPrefix}), 'ERR_INVALID_ARGUMENT');
    });

    it('fails closed for conflict, incomplete RM-08 observation, destination, and Git-ignore states', function () {
        expectCode(() => planner({conflicts: [{kind: 'shared-write', laneId: 'lane-a', detail: 'control-home'}]}).buildInitPlan(request()), 'ERR_PREFLIGHT_FAILED');
        expectCode(() => planner({complete: false}).buildInitPlan(request()), 'ERR_PREFLIGHT_FAILED');
        expectCode(() => planner({destination: true}).buildInitPlan(request()), 'ERR_PREFLIGHT_FAILED');
        expectCode(() => planner({ignored: false}).buildInitPlan(request()), 'ERR_PREFLIGHT_FAILED');
        expect(planner({ignored: false}).buildInitPlan({...request(), updateGitignore: true}).warnings.at(-1)?.code).toBe('GITIGNORE_UPDATE_PENDING');
    });

    it('rejects absent and ambiguous pack bindings and missing control home', function () {
        expectCode(() => planner({pack: '/elsewhere/pack'}).buildInitPlan(request()), 'ERR_PREFLIGHT_FAILED');
        const nested = binding('nested', '/repo/pack');
        expectCode(() => planner({scope: {bindings: [binding(), nested], warnings: []}}).buildInitPlan(request()), 'ERR_PREFLIGHT_FAILED');
        expectCode(() => planner({scope: {bindings: [binding('other', '/other')], warnings: []}}).buildInitPlan(request()), 'ERR_PREFLIGHT_FAILED');
    });

    it('preserves accepted unknown-scope warnings and runtime catalog resolution', function () {
        const scope = {bindings: [binding()], warnings: [{code: 'SCOPE_UNKNOWN_FIELD' as const, message: 'Ignored unknown scope.future.'}]};
        const plan = planner({scope}).buildInitPlan({...request(), runtimeVersion: '1.2.3'});
        expect(plan.warnings).toEqual(scope.warnings);
        expect(plan.runtime).toEqual({version: '1.2.3', root: '/runtime/1.2.3'});
    });
});

describe('coordinator routing correction matrix', function () {
    it('accepts the normative session shape and exact class floors', function () {
        expect(validateRoutingPolicy(routing()).operatorSessionClasses.D1).toEqual({primary: 'high', fallbacks: []});
    });

    it('rejects under-capability D3, unknown fields, duplicate routes/endpoints, and secrets', function () {
        const low = routing(); low.endpoints[0].capabilityClass = 'C2';
        expectCode(() => validateRoutingPolicy(low), 'ERR_INVALID_ARGUMENT');
        const unknown = routing() as Record<string, unknown>; unknown.future = true;
        expectCode(() => validateRoutingPolicy(unknown), 'ERR_INVALID_ARGUMENT');
        const duplicate = routing(); duplicate.endpoints.push({...duplicate.endpoints[0]});
        expectCode(() => validateRoutingPolicy(duplicate), 'ERR_INVALID_ARGUMENT');
        const routeDuplicate = routing(); routeDuplicate.classes.D1.fallbacks = ['high'];
        expectCode(() => validateRoutingPolicy(routeDuplicate), 'ERR_INVALID_ARGUMENT');
        const secret = routing(); secret.endpoints[0].accountId = 'token=hidden';
        expectCode(() => validateRoutingPolicy(secret), 'ERR_INVALID_ARGUMENT');
    });

    it('permits a policy to raise a class minimum without lowering the v1 floor', function () {
        const raised = routing();
        raised.classes.D1.minimumCapability = 'C5';
        expect(validateRoutingPolicy(raised).classes.D1.minimumCapability).toBe('C5');
    });
});

interface Changes {scope?: ScopeReadResult; conflicts?: readonly InitConflict[]; complete?: boolean; destination?: boolean; ignored?: boolean; pack?: string;}
function planner(changes: Changes = {}): InitPlanner { return new InitPlanner(new FakePreflight(changes)); }
class FakePreflight implements InitPreflightPort {
    constructor(private readonly changes: Changes) {}
    resolveWorkspace(): string { return '/repo'; }
    resolvePack(): string { return this.changes.pack ?? '/repo/pack'; }
    readScope(): ScopeReadResult { return this.changes.scope ?? {bindings: [binding()], warnings: []}; }
    readRouting(): CoordinatorRoutingPolicy { return validateRoutingPolicy(routing()); }
    destinationExists(): boolean { return this.changes.destination ?? false; }
    gitIgnored(): boolean { return this.changes.ignored ?? true; }
    runtimeRoot(version: string): string { return `/runtime/${version}`; }
    laneId(): string { return '11111111-1111-4111-8111-111111111111'; }
    inspectConflicts() { return {complete: this.changes.complete ?? true, conflicts: this.changes.conflicts ?? []}; }
    qualifyRouting() { return {policyVersion: 'shipping-v1' as const, adapters: ['opencode-cli'], reserves: ['routine-cycles', 'reject-correction', 're-review', 'complex-escalation', 'operator-session']}; }
}
function request(): InitRequest { return {slug: 'lane-1', tmuxPrefix: 'lane', implPackPath: 'pack', coordinatorRoutingPath: 'routing.json', updateGitignore: false, dryRun: true, cwd: '/repo'}; }
function binding(id = 'control-home', path = '/repo'): RepositoryBinding { return {id, path, branch: 'main', role: 'primary', access: 'write', worktreeMode: 'dedicated'}; }
function routing() { return {schemaVersion: 1, endpoints: [{endpointId: 'high', hostId: 'local', osUser: 'operator', adapterId: 'opencode-cli', provider: 'openai', accountId: 'primary', model: 'configured', effort: 'high', capabilityClass: 'C5'}], classes: {D1: {minimumCapability: 'C2', primary: 'high', fallbacks: [] as string[]}, D2: {minimumCapability: 'C3', primary: 'high', fallbacks: [] as string[]}, D3: {minimumCapability: 'C5', primary: 'high', fallbacks: [] as string[]}}, operatorSessionClasses: {D1: {primary: 'high', fallbacks: []}, D2: {primary: 'high', fallbacks: []}, D3: {primary: 'high', fallbacks: []}}, operatorSessionBudgetPolicyRef: 'context-policy.json#operatorSession'}; }
function expectCode(action: () => unknown, code: string): void { try { action(); } catch (error) { expect((error as WatchtowerError).code).toBe(code); return; } fail(`Expected ${code}.`); }
