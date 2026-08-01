import {basename} from 'node:path';

import type {
    CatalogAggregateFileHandle,
    CatalogAggregateFileInfo,
    CatalogAggregateFileSystem
} from '../../src/foundation/taskCatalogComposition/catalogAggregateFileSystem.js';

export interface CatalogFileSystemFault {
    readonly operationPrefix: string;
    readonly occurrence: number;
}

export interface CatalogFileSystemGate {
    readonly operationPrefix: string;
    readonly reached: Promise<void>;
    release(): void;
    wait(): Promise<void>;
}

function ioFailure(operation: string): Error & {readonly code: string} {
    return Object.assign(new Error(`injected:${operation}`), {code: 'EIO'});
}

export function createCatalogFileSystemGate(operationPrefix: string): CatalogFileSystemGate {
    let signalReached: () => void = () => undefined;
    let signalRelease: () => void = () => undefined;
    const reached = new Promise<void>((resolve) => {
        signalReached = resolve;
    });
    const released = new Promise<void>((resolve) => {
        signalRelease = resolve;
    });
    return {
        operationPrefix,
        reached,
        release: signalRelease,
        async wait(): Promise<void> {
            signalReached();
            await released;
        }
    };
}

class FaultController {
    private readonly counts = new Map<number, number>();
    private gated = false;

    constructor(
        private readonly faults: readonly CatalogFileSystemFault[],
        private readonly gate?: CatalogFileSystemGate
    ) {}

    async before(operation: string): Promise<void> {
        if (!this.gated && this.gate?.operationPrefix !== undefined &&
            operation.startsWith(this.gate.operationPrefix)) {
            this.gated = true;
            await this.gate.wait();
        }
        for (let index = 0; index < this.faults.length; index += 1) {
            const fault = this.faults[index];
            if (!operation.startsWith(fault.operationPrefix)) continue;
            const count = (this.counts.get(index) ?? 0) + 1;
            this.counts.set(index, count);
            if (count === fault.occurrence) throw ioFailure(operation);
        }
    }
}

class FaultInjectingHandle implements CatalogAggregateFileHandle {
    constructor(
        private readonly path: string,
        private readonly delegate: CatalogAggregateFileHandle,
        private readonly controller: FaultController
    ) {}

    async writeFile(bytes: Uint8Array): Promise<void> {
        await this.controller.before(`write:${basename(this.path)}`);
        await this.delegate.writeFile(bytes);
    }

    async chmod(mode: number): Promise<void> {
        await this.controller.before(`chmod:${basename(this.path)}`);
        await this.delegate.chmod(mode);
    }

    async sync(): Promise<void> {
        await this.controller.before(`sync:${basename(this.path)}`);
        await this.delegate.sync();
    }

    async close(): Promise<void> {
        await this.controller.before(`close:${basename(this.path)}`);
        await this.delegate.close();
    }
}

export class FaultInjectingCatalogFileSystem implements CatalogAggregateFileSystem {
    private readonly controller: FaultController;

    constructor(
        private readonly delegate: CatalogAggregateFileSystem,
        faults: readonly CatalogFileSystemFault[] = [],
        gate?: CatalogFileSystemGate
    ) {
        this.controller = new FaultController(faults, gate);
    }

    lstat(path: string): Promise<CatalogAggregateFileInfo> {
        return this.delegate.lstat(path);
    }

    async open(path: string, flags: string, mode?: number): Promise<CatalogAggregateFileHandle> {
        await this.controller.before(`open:${flags}:${basename(path)}`);
        const handle = await this.delegate.open(path, flags, mode);
        return new FaultInjectingHandle(path, handle, this.controller);
    }

    async rename(source: string, target: string): Promise<void> {
        await this.controller.before(`rename:${basename(source)}->${basename(target)}`);
        await this.delegate.rename(source, target);
    }

    async unlink(path: string): Promise<void> {
        await this.controller.before(`unlink:${basename(path)}`);
        await this.delegate.unlink(path);
    }
}
