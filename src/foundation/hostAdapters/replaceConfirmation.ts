import {createInterface} from 'node:readline/promises';

/**
 * Interactive replacement confirmation is a host-side terminal adapter. Keeping the raw
 * terminal handles below the foundation boundary leaves command facades dependent only on
 * the typed confirmation port.
 */
export interface ReplaceConfirmationPort {
    isInteractive(json: boolean): boolean;
    confirm(prompt: string): Promise<boolean>;
}

export const terminalReplaceConfirmation: ReplaceConfirmationPort = {
    isInteractive: (json) => !json && process.stdin.isTTY === true && process.stdout.isTTY === true,
    async confirm(prompt) {
        const rl = createInterface({input: process.stdin, output: process.stdout});
        try {
            return /^y(es)?$/iu.test((await rl.question(`${prompt} [y/N] `)).trim());
        } finally {
            rl.close();
        }
    }
};
