import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDerivedStorage} from '../../../src/foundation/storage/index.js';
import type {
    DerivedStorage,
    DerivedStorageOpenOptions,
    DerivedStore,
    DerivedStoreKind,
    DerivedStoreSchema,
    DerivedStoreWriter
} from '../../../src/foundation/storage/index.js';

/** item/edge schema with a declared foreign key from edge.fromId to item.id. */
export const GRAPH_SCHEMA: DerivedStoreSchema = [
    {name: 'item', columns: [{name: 'id', type: 'integer', notNull: true}, {name: 'label', type: 'text'}], primaryKey: ['id']},
    {
        name: 'edge',
        columns: [{name: 'fromId', type: 'integer', notNull: true}, {name: 'toId', type: 'integer', notNull: true}],
        primaryKey: ['fromId', 'toId'],
        foreignKeys: [{columns: ['fromId'], references: {table: 'item', columns: ['id']}}]
    }
];

/**
 * owner/asset schema whose foreign key sits on a non-primary-key column, so the
 * mandatory insert, update, and delete violation matrix can all be driven
 * through the typed mutation surface.
 */
export const FK_SCHEMA: DerivedStoreSchema = [
    {name: 'owner', columns: [{name: 'id', type: 'integer', notNull: true}, {name: 'name', type: 'text'}], primaryKey: ['id']},
    {
        name: 'asset',
        columns: [
            {name: 'id', type: 'integer', notNull: true},
            {name: 'ownerId', type: 'integer', notNull: true},
            {name: 'label', type: 'text'}
        ],
        primaryKey: ['id'],
        foreignKeys: [{columns: ['ownerId'], references: {table: 'owner', columns: ['id']}}]
    }
];

export function makeWorkDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-store-'));
}

export function removeWorkDir(dir: string): void {
    rmSync(dir, {recursive: true, force: true});
}

/** The single public entry point under proof: a composition root at one lane index root. */
export function storageAt(root: string): DerivedStorage {
    return openDerivedStorage(root);
}

export function openTemp(
    root: string,
    kind: DerivedStoreKind,
    options: DerivedStorageOpenOptions = {create: true},
    schema: DerivedStoreSchema = GRAPH_SCHEMA
): Promise<DerivedStore> {
    return storageAt(root).open(kind, schema, options);
}

/** Seed the two graph items and one edge used across fixtures. */
export async function seedGraph(store: DerivedStoreWriter): Promise<void> {
    await store.insert('item', {id: 1n, label: 'alpha'});
    await store.insert('item', {id: 2n, label: 'beta'});
    await store.insert('edge', {fromId: 1n, toId: 2n});
}

/** Seed two owners and one asset referencing owner 1. */
export async function seedForeignKeys(store: DerivedStoreWriter): Promise<void> {
    await store.insert('owner', {id: 1n, name: 'alpha'});
    await store.insert('owner', {id: 2n, name: 'beta'});
    await store.insert('asset', {id: 10n, ownerId: 1n, label: 'widget'});
}

export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Await a promise expected to reject and return the thrown error's reason code. */
export async function rejectionCode(promise: Promise<unknown>): Promise<string | undefined> {
    try {
        await promise;
        return undefined;
    } catch (error) {
        return (error as {code?: string}).code;
    }
}

/** Await a promise expected to reject and return the thrown error itself. */
export async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
        return undefined;
    } catch (error) {
        return error;
    }
}
