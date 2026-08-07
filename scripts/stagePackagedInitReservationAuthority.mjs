import {copyFile, mkdir, rm, access} from 'node:fs/promises';
import {join} from 'node:path';

const INIT_DIR = join('src', 'foundation', 'init');
const DIST_INIT = join('dist', 'src', 'foundation', 'init');
const BACKUP_DIR = join('.local', 'dist-stage-backup', 'init-reservation-authority');
const PRUNED_DIST_FILES = ['endpointReservationAuthoritySeal.js'];
const STAGED = [
    ['endpointReservationAuthorityLiveSource.packaged.ts', 'endpointReservationAuthorityLiveSource.ts'],
    ['endpointReservationAuthorityComposition.packaged.ts', 'endpointReservationAuthorityComposition.ts']
];

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

export async function stagePackagedInitReservationAuthority() {
    await mkdir(BACKUP_DIR, {recursive: true});
    for (const [, target] of STAGED) {
        const live = join(INIT_DIR, target);
        const backup = join(BACKUP_DIR, target);
        if (!(await exists(live))) throw new Error(`STAGE_SOURCE_MISSING: ${live}`);
        await copyFile(live, backup);
    }
    for (const [source, target] of STAGED) {
        await copyFile(join(INIT_DIR, source), join(INIT_DIR, target));
    }
    process.stdout.write('{"ok":true,"stage":"packaged-init-reservation-authority"}\n');
}

export async function restorePackagedInitReservationAuthority() {
    if (!(await exists(BACKUP_DIR))) return;
    for (const [, target] of STAGED) {
        const live = join(INIT_DIR, target);
        const backup = join(BACKUP_DIR, target);
        if (await exists(backup)) await copyFile(backup, live);
    }
    await rm(BACKUP_DIR, {recursive: true, force: true});
    process.stdout.write('{"ok":true,"restore":"packaged-init-reservation-authority"}\n');
}

/** Remove dev-only init modules that dist compile may still emit via type-only imports. */
export async function prunePackagedInitReservationAuthorityDist() {
    for (const file of PRUNED_DIST_FILES) {
        const path = join(DIST_INIT, file);
        if (await exists(path)) await rm(path);
    }
    process.stdout.write('{"ok":true,"prune":"packaged-init-reservation-authority-dist"}\n');
}

const command = process.argv[2];
if (command === 'stage') await stagePackagedInitReservationAuthority();
else if (command === 'restore') await restorePackagedInitReservationAuthority();
else if (command === 'prune-dist') await prunePackagedInitReservationAuthorityDist();
else throw new Error('Usage: node scripts/stagePackagedInitReservationAuthority.mjs <stage|restore|prune-dist>');
