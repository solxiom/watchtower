import {readFile, access} from 'node:fs/promises';
import {join} from 'node:path';

const DIST_INIT = join('dist', 'src', 'foundation', 'init');
const FORBIDDEN_EXPORTS = [
    'replaceEndpointReservationLiveSnapshot',
    'authorizeEndpointReservationLiveSource',
    'endpointReservationCompositionLiveSource',
    'grantEndpointReservationCompositionCapability',
    'endpointReservationCompositionCapability',
    'getEndpointReservationCompositionCapabilityForInitAccess',
    'createEndpointReservationAuthorityForComposition',
    'mintEndpointReservationAuthorization',
    'replaceEndpointReservationAuthoritySnapshot',
    'sealEndpointReservationAuthority'
];
const FORBIDDEN_FILES = [
    'endpointReservationAuthorityCompositionAccess.js',
    'endpointReservationAuthorityLiveSnapshotStore.js',
    'endpointReservationAuthoritySeal.js',
    'EndpointReservationAuthority.js'
];
const CHECKED_MODULES = [
    'endpointReservationAuthorityLiveSource.js',
    'endpointReservationAuthorityComposition.js'
];

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

function exportedSymbols(source) {
    const names = [];
    for (const match of source.matchAll(/export (?:async )?function ([A-Za-z0-9_]+)/g)) names.push(match[1]);
    for (const match of source.matchAll(/export const ([A-Za-z0-9_]+)/g)) names.push(match[1]);
    for (const match of source.matchAll(/export \{([^}]+)\}/g)) {
        for (const part of match[1].split(',')) {
            const name = part.trim().split(/\s+as\s+/u).pop()?.trim();
            if (name) names.push(name);
        }
    }
    return names;
}

async function verify() {
    if (!(await exists(DIST_INIT))) throw new Error('DIST_INIT_MISSING: dist init modules are not built');
    for (const file of FORBIDDEN_FILES) {
        if (await exists(join(DIST_INIT, file))) throw new Error(`DIST_FORBIDDEN_FILE: ${file}`);
    }
    for (const file of CHECKED_MODULES) {
        const path = join(DIST_INIT, file);
        if (!(await exists(path))) continue;
        const source = await readFile(path, 'utf8');
        const offenders = exportedSymbols(source).filter(name => FORBIDDEN_EXPORTS.includes(name));
        if (offenders.length > 0) throw new Error(`DIST_FORBIDDEN_EXPORT: ${file} exports ${offenders.join(', ')}`);
        if (source.includes('replaceEndpointReservationLiveSnapshot(') && file.includes('LiveSource')) {
            throw new Error(`DIST_FORBIDDEN_SYMBOL: ${file} retains live snapshot replacement`);
        }
        if (source.includes('sealEndpointReservationAuthority(') && file.includes('Seal')) {
            throw new Error(`DIST_FORBIDDEN_SYMBOL: ${file} retains external authority sealing`);
        }
    }
    if (!(await exists(join(DIST_INIT, 'endpointReservationAuthorityComposition.js')))) {
        throw new Error('DIST_REQUIRED_FILE_MISSING: endpointReservationAuthorityComposition.js');
    }
    process.stdout.write('{"ok":true,"reservationAuthoritySeams":"closed"}\n');
}

await verify();
