import {randomUUID} from 'node:crypto';

import {runTaskCatalogCompositionTask} from
    '../build/src/foundation/task/catalog/taskCatalogCompositionFileAdapter.js';

const mode = process.argv[2];
const result = await runTaskCatalogCompositionTask(process.cwd(), {mode}, {tempToken: randomUUID});
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.ok) process.exitCode = 1;
