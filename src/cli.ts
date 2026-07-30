import {run} from "./run.js";
import path from "path";
import {argUtil} from "@nirvana/base/utils";
import {output as prettyOutput} from "@nirvana/base/utils/pretty";
import {fileURLToPath} from "url";
import {CArgMap} from "@nirvana/base/cli/contracts";
import {X} from "@nirvana/commons/utilify";


/*
 * This is the only placement contract owned by the outer host:
 * compiled cli.js lives directly in the current package root. The host
 * uses that path only as the current-runner fallback base. Explicit
 * --cmd-wt-base and project-local runner discovery both override it through
 * runner selection.
 */
const __filename = fileURLToPath(import.meta.url),
    __dirname = path.dirname(__filename);


/**
 * Outer CLI host.
 *
 * This module has one deliberately narrow responsibility: discover the run
 * environment needed to choose the owning wt runner, then delegate. It must
 * stay a thin selection boundary. Do not add product command behavior here:
 * no help rendering, serve UI, command registry policy, ecosystem install or
 * ensure flows, work-root mutation, generator/template logic, or command
 * preflight decisions. Those belong to the selected runner behind `run.ts`.
 *
 * The compiled `cli.js` file must live directly in the compiled/package root
 * of a wt instance. Packaging owns that layout.
 *
 * If your cli solution has a dual installation modes like global and local.
 * In such cases, the `cli.ts` always should always decide the selected base
 * for the invocation and forwards it as `--cmd-wt-base` to the `run.ts`.
 *
 * The selected `run.ts` must trust that value and must not override
 * it from its own module path.
 */
export default async function runCli(...args: string[]): Promise<void> {

    try {
        const defaultCWD = process.cwd(),
            argMap: CArgMap = (
                argUtil as { makeArgMap: (args: any[]) => CArgMap }
            ).makeArgMap(args);

        // Read --debug-runner before filtering. This is a user-facing opt-in flag;
        // it is NOT forwarded to the selected runner so inner invocations stay quiet.
        const debugRunner = (args as string[]).some(
            a => typeof a === 'string' && a.trim() === '--debug-runner'
        );

        args = args.filter(nxt => {
            return X.isString(nxt) && X.isString(nxt.trim()) && !(
                nxt.trim().startsWith('--cmd-original-user-dir=') ||
                nxt.trim().startsWith('--cmd-wt-base=') ||
                nxt.trim().startsWith('--cmd-user-env=') || nxt.trim().startsWith('--cmd-user-dir=') ||
                nxt.trim() === '--debug-runner'
            );
        });

        if (debugRunner) {
            /*
             * You might want to render some diagnostics!
             * */
        }

        await run({
            args
        });
    } catch (err: any) {
        prettyOutput.write(String(err?.stack || err), "error", 0, true);
        process.exit(1);
    }
}
