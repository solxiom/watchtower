import type {HelpJSON} from "@nirvana/base/cli/contracts/types";
import {makeCLI} from "@nirvana/base/cli";
import {view as helpView} from "@nirvana/base/cli/help";
import path, {dirname} from "path";
import {fileURLToPath} from "url";
import {readFile} from "fs/promises";
import {X} from "@nirvana/commons/utilify";

const cliRootPath = dirname(fileURLToPath(import.meta.url));

async function renderStaticHelp(args: string[]): Promise<boolean> {

    const requestedName = args.find(arg => !arg.startsWith("--"));
    if (requestedName !== "help") {
        return false;
    }

    const helpJSONPath = path.resolve(path.join(cliRootPath, "..", "help", "help.json")),
        helpData = JSON.parse(await readFile(helpJSONPath, "utf8")) as HelpJSON,
        helpKey = args.filter(arg => !arg.startsWith("--"))[1],
        commandManager = {
            async all() {
                return [];
            }
        } as any;

    if (X.isString(helpKey) && X.isString(helpKey.trim())) {
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
            return args;
        }
    });
}

export async function run({args = process.argv.slice(2)}: { args?: string[] } = {}): Promise<void> {
    if (await renderStaticHelp(args)) {
        return;
    }

    const cli = await createCli();
    await cli.run({args});
}

export default run;
