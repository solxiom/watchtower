import Ajv2020 from 'ajv/dist/2020.js';
import {hasDuplicateJsonObjectKey} from './schemaComposition/jsonDuplicateKeyDetector.js';
import {isJsonObject, isJsonValue} from './schemaComposition/jsonCanonicalizer.js';
import {loadV1SchemaBundle} from './schemaBundle.js';
import {isRfc3339DateTime} from './rfc3339DateTime.js';
import {projectPackRecords} from './statusPackRecordProjection.js';
import type {PackAcceptanceRecord, PackLockRecord, PackManifestRecord} from './statusPackTypes.js';
import type {JsonObject} from './schemaComposition/schemaCompositionContracts.js';

export class StatusPackContractReader {
    read(manifestText: string, acceptanceText: string, lockText: string): {
        manifest: PackManifestRecord; acceptance: PackAcceptanceRecord; lock: PackLockRecord;
    } | undefined {
        const values = [manifestText, acceptanceText, lockText].map(parseJson);
        const manifest = values[0]; const acceptance = values[1]; const lock = values[2];
        if (manifest === undefined || acceptance === undefined || lock === undefined) return undefined;
        const loaded = loadV1SchemaBundle();
        if (!loaded.ok) return undefined;
        const ajv = new Ajv2020({strict: false});
        ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        ajv.addFormat('date-time', isRfc3339DateTime);
        ajv.addSchema(loaded.bundle.schema);
        const ids = ['implementationPack', 'packAcceptance', 'implementationPackLock'];
        if (ids.some((id, index) => ajv.getSchema(`${loaded.bundle.id}#/$defs/${id}`)?.(values[index]) !== true)) {
            return undefined;
        }
        return projectPackRecords(manifest, acceptance, lock);
    }
}

function parseJson(text: string): JsonObject | undefined {
    try {
        if (hasDuplicateJsonObjectKey(text)) return undefined;
        const value: unknown = JSON.parse(text);
        return isJsonValue(value) && isJsonObject(value) ? value : undefined;
    } catch { return undefined; }
}
