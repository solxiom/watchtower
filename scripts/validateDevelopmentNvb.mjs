import {realpathSync, readFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import JSON5 from 'json5';

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const defaultConfig = resolve(repositoryRoot, 'nvb.json');
const expectedCatalog = resolve(repositoryRoot, 'nvb/developmentNvbCatalog.json');
const maximumConfigLines = 120;
const allowedConfigKeys = new Set(['parent', 'handlers', 'tasks', 'groups']);

function fail(code, message) {
    throw new Error(`${code}: ${message}`);
}

function parseArguments(argv) {
    if (argv.length === 0) return {configPath: defaultConfig, catalogPath: expectedCatalog};
    if (argv.length !== 2 && argv.length !== 4) fail('DEVELOPMENT_NVB_ARGUMENT_INVALID', 'invalid arguments');
    const values = new Map();
    for (let index = 0; index < argv.length; index += 2) {
        const [name, value] = argv.slice(index, index + 2);
        if ((name !== '--config' && name !== '--baseline') || values.has(name)) {
            fail('DEVELOPMENT_NVB_ARGUMENT_INVALID', 'usage: validateDevelopmentNvb.mjs [--config <path>] [--baseline <path>]');
        }
        values.set(name, resolve(process.cwd(), value));
    }
    return {configPath: values.get('--config') ?? defaultConfig, catalogPath: values.get('--baseline') ?? expectedCatalog};
}

function isInside(targetPath) {
    const path = relative(repositoryRoot, targetPath);
    return path === '' || (!path.startsWith('..') && !path.includes('/../'));
}

function canonicalTarget(targetPath) {
    let canonical;
    try {
        canonical = realpathSync(targetPath);
    } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
        if (code === 'ENOENT' || code === 'ENOTDIR') fail('DEVELOPMENT_NVB_PARENT_MISSING', targetPath);
        fail('DEVELOPMENT_NVB_PARENT_UNREADABLE', targetPath);
    }
    if (!isInside(canonical)) fail('DEVELOPMENT_NVB_PARENT_ESCAPE', canonical);
    return canonical;
}

function physicalLineCount(text) {
    const normalized = text.replace(/\r\n/g, '\n');
    if (normalized === '') return 0;
    const body = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
    return body.split('\n').length;
}

function readLimitedText(canonicalPath) {
    let text;
    try {
        text = readFileSync(canonicalPath, 'utf8');
    } catch {
        fail('DEVELOPMENT_NVB_PARENT_UNREADABLE', canonicalPath);
    }
    if (physicalLineCount(text) > maximumConfigLines) {
        fail('DEVELOPMENT_NVB_PHYSICAL_LIMIT', canonicalPath);
    }
    return text;
}

function readConfig(canonicalPath) {
    const text = readLimitedText(canonicalPath);
    try {
        return JSON5.parse(text);
    } catch {
        fail('DEVELOPMENT_NVB_SCHEMA_INVALID', canonicalPath);
    }
}

function configEntries(value, kind, configPath) {
    if (value === undefined) return [];
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        fail('DEVELOPMENT_NVB_SCHEMA_INVALID', `${configPath} ${kind} must be an object`);
    }
    return Object.entries(value);
}

function validateConfig(config, configPath) {
    if (config === null || typeof config !== 'object' || Array.isArray(config)) {
        fail('DEVELOPMENT_NVB_SCHEMA_INVALID', `${configPath} must be an object`);
    }
    for (const key of Object.keys(config)) {
        if (!allowedConfigKeys.has(key)) fail('DEVELOPMENT_NVB_UNSUPPORTED_FIELD', `${configPath} ${key}`);
    }
    if (config.parent !== undefined && (typeof config.parent !== 'string' || config.parent.length === 0)) {
        fail('DEVELOPMENT_NVB_SCHEMA_INVALID', `${configPath} parent must be a non-empty string`);
    }
    if (config.handlers !== undefined && (!Array.isArray(config.handlers) || !config.handlers.every((entry) => typeof entry === 'string'))) {
        fail('DEVELOPMENT_NVB_SCHEMA_INVALID', `${configPath} handlers must be a string array`);
    }
    return config;
}

function addIdentities(entries, identities, duplicateCode) {
    for (const [id, definition] of entries) {
        if (id.length === 0 || definition === null || typeof definition !== 'object' || Array.isArray(definition)) {
            fail('DEVELOPMENT_NVB_SCHEMA_INVALID', id);
        }
        if (identities.has(id)) fail(duplicateCode, id);
        identities.add(id);
    }
}

function loadConfig(targetPath, stack, result) {
    const canonicalPath = canonicalTarget(targetPath);
    if (stack.includes(canonicalPath)) fail('DEVELOPMENT_NVB_PARENT_CYCLE', [...stack, canonicalPath].join(' -> '));
    const config = validateConfig(readConfig(canonicalPath), canonicalPath);
    if (config.parent !== undefined) {
        loadConfig(resolve(dirname(canonicalPath), config.parent), [...stack, canonicalPath], result);
    }
    addIdentities(configEntries(config.tasks, 'tasks', canonicalPath), result.tasks, 'DEVELOPMENT_NVB_TASK_DUPLICATE');
    addIdentities(configEntries(config.groups, 'groups', canonicalPath), result.groups, 'DEVELOPMENT_NVB_GROUP_DUPLICATE');
}

function validBaseline(ids, kind) {
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string') || new Set(ids).size !== ids.length) {
        fail('DEVELOPMENT_NVB_BASELINE_INVALID', `accepted ${kind} catalog contains an invalid or duplicate identity`);
    }
    return ids;
}

function compareCatalog(actual, expected, kind) {
    if (JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())) {
        fail('DEVELOPMENT_NVB_CATALOG_DRIFT', `${kind} identity differs from the accepted baseline`);
    }
}

function readBaseline(catalogPath) {
    const canonicalPath = canonicalTarget(catalogPath);
    const text = readLimitedText(canonicalPath);
    let baseline;
    try {
        baseline = JSON.parse(text);
    } catch {
        fail('DEVELOPMENT_NVB_BASELINE_CORRUPT', canonicalPath);
    }
    if (baseline === null || typeof baseline !== 'object' || Array.isArray(baseline)) {
        fail('DEVELOPMENT_NVB_BASELINE_INVALID', canonicalPath);
    }
    const keys = Object.keys(baseline).sort();
    if (keys.length !== 2 || keys[0] !== 'groupIds' || keys[1] !== 'taskIds') {
        fail('DEVELOPMENT_NVB_BASELINE_INVALID', canonicalPath);
    }
    return baseline;
}

function validate(options) {
    const result = {tasks: new Set(), groups: new Set()};
    loadConfig(options.configPath, [], result);
    if (resolve(options.configPath) === defaultConfig) {
        const baseline = readBaseline(options.catalogPath);
        const taskIds = validBaseline(baseline.taskIds, 'task');
        const groupIds = validBaseline(baseline.groupIds, 'group');
        compareCatalog(result.tasks, taskIds, 'task');
        compareCatalog(result.groups, groupIds, 'group');
    }
    return result;
}

const result = validate(parseArguments(process.argv.slice(2)));
process.stdout.write(`${JSON.stringify({tasks: [...result.tasks].sort(), groups: [...result.groups].sort()})}\n`);
