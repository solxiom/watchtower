import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {relative, sep} from 'node:path';
import type {RepositoryBinding} from '../contracts/index.js';
import {StatusRepositoryGitInspector} from './StatusRepositoryGitInspector.js';
import type {PackAcceptedInput, PackFileDigest} from './statusPackTypes.js';
import {regularContainedFile} from './statusRegularFileIdentity.js';

export class StatusAcceptedInputInspector {
    constructor(private readonly git = new StatusRepositoryGitInspector()) {}

    async inspect(inputs: readonly PackAcceptedInput[], bindings: readonly RepositoryBinding[], packRoot: string,
        sealedFiles: readonly PackFileDigest[]): Promise<AcceptedInputState> {
        try {
            for (const input of inputs) {
                if (!sealedFiles.some(file => file.path === input.acceptanceRef) ||
                    regularContainedFile(packRoot, input.acceptanceRef) === undefined) return 'changed';
                const binding = bindings.find(item => item.id === input.repository);
                if (binding === undefined) return 'changed';
                const target = regularContainedFile(binding.path, input.path);
                if (target === undefined || digest(readFileSync(target)) !== input.sha256) return 'changed';
                const gitState = await this.git.currentRegularFile(binding.path,
                    relative(binding.path, target).split(sep).join('/'));
                if (gitState !== 'current') return gitState;
            }
            return 'current';
        } catch (error) { return unavailable(error) ? 'unavailable' : 'changed'; }
    }
}

export type AcceptedInputState = 'current' | 'changed' | 'unavailable';

function digest(bytes: Buffer): string {
    return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function unavailable(error: unknown): boolean {
    return error instanceof Error && 'code' in error && ['EACCES', 'EPERM', 'EMFILE'].includes(String(error.code));
}
