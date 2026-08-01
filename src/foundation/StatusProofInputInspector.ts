import {StatusRepositoryGitInspector} from './StatusRepositoryGitInspector.js';
import type {PackProofInput} from './statusPackTypes.js';
import {regularContainedFile} from './statusRegularFileIdentity.js';

export class StatusProofInputInspector {
    constructor(private readonly git = new StatusRepositoryGitInspector()) {}

    async inspect(repository: string, revision: string,
        inputs: readonly PackProofInput[]): Promise<ProofInputIdentityState> {
        try {
            for (const input of inputs) {
                if (regularContainedFile(repository, input.path) === undefined) return 'invalid';
                const gitState = await this.git.regularFileAtRevision(repository, input.path, revision);
                if (gitState !== 'current') return gitState === 'unavailable' ? 'unavailable' : 'invalid';
            }
            return 'current';
        } catch (error) { return unavailable(error) ? 'unavailable' : 'invalid'; }
    }
}

export type ProofInputIdentityState = 'current' | 'invalid' | 'unavailable';

function unavailable(error: unknown): boolean {
    return error instanceof Error && 'code' in error && ['EACCES', 'EPERM', 'EMFILE'].includes(String(error.code));
}
