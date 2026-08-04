import type {HelpJSON} from "@nirvana/base/cli/contracts/types";
import type {CommandManager} from '@nirvana/base/cli/contracts';
import {makeCLI} from "@nirvana/base/cli";
import {view as helpView} from "@nirvana/base/cli/help";
import path, {dirname} from "path";
import {fileURLToPath} from "url";
import {readFile} from "fs/promises";
import {WatchtowerError} from './contracts/index.js';
import {buildCommandError, renderError} from './foundation/presentation/index.js';
import {validateRawReadCommandArguments} from './commands/shared/readCommandOptions.js';

const cliRootPath = dirname(fileURLToPath(import.meta.url));

async function renderStaticHelp(args: string[]): Promise<boolean> {

    const requestedName = args.find(arg => !arg.startsWith("--"));
    const flagRequested = args.includes('--help');
    if (requestedName !== "help" && !flagRequested) {
        return false;
    }
    if (args.some(arg => arg === '--json' || arg.startsWith('--json='))) {
        throw invalidHelpJson();
    }

    const helpJSONPath = path.resolve(path.join(cliRootPath, "..", "help", "help.json")),
        helpData = JSON.parse(await readFile(helpJSONPath, "utf8")) as HelpJSON,
        helpKey = requestedName === 'help' ? args.filter(arg => !arg.startsWith("--"))[1] : requestedName,
        commandManager = {
            async all() {
                return [];
            }
        } as unknown as CommandManager;

    if (typeof helpKey === 'string' && helpKey.trim().length > 0) {
        await helpView.commandIndex({
            appName: "wt",
            commandName: helpKey,
            data: helpData,
            commandManager
        });
        return true;
    }

    await helpView.helpIndex({
        appName: "wt",
        data: helpData,
        commandManager
    });
    return true;
}

export async function createCli() {
    return makeCLI({
        appName: "wt",
        commandRootDirectories: [path.resolve(path.join(cliRootPath, "commands"))],
        helpJSONPath: path.resolve(path.join(cliRootPath, "..", "help", "help.json")),
        processArgs(args: string[]): string[] {
            validateRawReadCommandArguments(args);
            return args;
        }
    });
}

export async function run({args = process.argv.slice(2)}: { args?: string[] } = {}): Promise<void> {
    try {
        if (await renderStaticHelp(args)) return;
        const cli = await createCli();
        await cli.run({args});
    } catch (error) {
        if (!(error instanceof WatchtowerError)) throw error;
        const json = args.some(arg => arg === '--json' || arg.startsWith('--json='));
        const command = commandIdentity(args);
        const rendered = renderError(buildCommandError(command, error), {
            json, noColor: json || args.includes('--no-color')
        });
        process.stderr.write(`${rendered}\n`);
        process.exitCode = error.exitCode;
    }
}

function commandIdentity(args: readonly string[]): string {
    const positional = args.filter(arg => !arg.startsWith('-'));
    return positional[0] === 'config' && positional[1] === 'show' ? 'config show' : positional[0] ?? 'unknown';
}

function invalidHelpJson(): WatchtowerError {
    return WatchtowerError.fromCode('ERR_INVALID_ARGUMENT', {
        operation: 'render help', target: '--json', remediation: 'Run help without JSON mode.'
    });
}

export default run;
