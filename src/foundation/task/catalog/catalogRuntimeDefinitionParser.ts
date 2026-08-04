import {isJsonObject} from '../../schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from './taskCatalogContracts.js';
import {hasExactKeys, stringArray} from './catalogParsing.js';

const HANDLER_ID = /^[A-Z][A-Za-z0-9]{0,127}$/;

export function validCatalogDoc(value: unknown): value is JsonObject {
    if (!isJsonObject(value) || !hasExactKeys(value, ['summary'], ['usage', 'details']) ||
        typeof value.summary !== 'string' || value.summary.length === 0) {
        return false;
    }
    const details = value.details;
    return (value.usage === undefined || typeof value.usage === 'string') &&
        (details === undefined || (Array.isArray(details) &&
            details.every((entry) => typeof entry === 'string')));
}

export function validCatalogRunnerOptions(value: unknown): value is JsonObject {
    if (!isJsonObject(value) || !hasExactKeys(value, [], ['preTasks', 'postTasks', 'multiExecPolicy'])) {
        return false;
    }
    const preTasks = value.preTasks === undefined ? [] : stringArray(value.preTasks);
    const postTasks = value.postTasks === undefined ? [] : stringArray(value.postTasks);
    return preTasks !== null && postTasks !== null &&
        (value.multiExecPolicy === undefined || value.multiExecPolicy === 'series' ||
            value.multiExecPolicy === 'parallel');
}

export function validCatalogHandle(value: unknown): value is JsonObject {
    return isJsonObject(value) && hasExactKeys(value, ['handler', 'type'], ['args', 'preferType']) &&
        typeof value.handler === 'string' && HANDLER_ID.test(value.handler) && value.type === 'auto' &&
        (value.args === undefined || Array.isArray(value.args)) &&
        (value.preferType === undefined || value.preferType === 'sync' || value.preferType === 'async');
}
