import Ajv2020 from 'ajv/dist/2020.js';
import {isRfc3339DateTime, isUuid} from './packSchemaFormats.js';
import {loadV1SchemaBundle, type SchemaBundleLoadResult} from '../schemaComposition/schemaBundle.js';
import {createWatchtowerError, type WatchtowerError} from '../../contracts/index.js';
import type {PackSchemaValidators} from './packConsumerPorts.js';

/**
 * Compiles the three pack-document validators from the RM-13 aggregate schema
 * bundle with the normative `uuid` and `date-time` formats enforced.
 */
export function loadPackSchemaValidators(
    schemaLoader: () => SchemaBundleLoadResult = loadV1SchemaBundle
): {ok: true; validators: PackSchemaValidators} | {ok: false; error: WatchtowerError} {
    try {
        const bundle = schemaLoader();
        if (bundle.ok === false) return {ok: false, error: bundle.error};
        const ajv = new Ajv2020({strict: false});
        ajv.addFormat('uuid', (value: string) => isUuid(value));
        ajv.addFormat('date-time', (value: string) => isRfc3339DateTime(value));
        ajv.addSchema(bundle.bundle.schema);
        const manifest = ajv.getSchema(`${bundle.bundle.id}#/$defs/implementationPack`);
        const lock = ajv.getSchema(`${bundle.bundle.id}#/$defs/implementationPackLock`);
        const acceptance = ajv.getSchema(`${bundle.bundle.id}#/$defs/packAcceptance`);
        if (manifest === undefined || lock === undefined || acceptance === undefined) {
            return {ok: false, error: schemaError('compiled pack validators are unavailable')};
        }
        return {ok: true, validators: Object.freeze({
            manifest: (value: unknown) => manifest(value) === true,
            lock: (value: unknown) => lock(value) === true,
            acceptance: (value: unknown) => acceptance(value) === true
        })};
    } catch {
        return {ok: false, error: schemaError('pack schema compilation failed')};
    }
}

function schemaError(target: string): WatchtowerError {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {
        operation: 'compile implementation-pack schema', target, remediation: 'restore the RM-13 generated schema asset'
    });
}
