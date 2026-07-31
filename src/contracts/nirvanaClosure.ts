export const NIRVANA_CLOSURE_REASONS = [
    'MALFORMED_MANIFEST',
    'ECOSYSTEM_VERSION_MISMATCH',
    'ECOSYSTEM_ROOT_INVALID',
    'MISSING_COMPONENT',
    'PACKAGE_IDENTITY_MISMATCH',
    'DUPLICATE_PACKAGE',
    'UNSAFE_DEPENDENCY_SPEC',
    'INCOMPLETE_CLOSURE',
    'SOURCE_LINK',
    'DIGEST_MISMATCH',
    'PACK_FAILED',
    'INSTALL_FAILED',
    'REGISTRY_FALLBACK',
    'INSTALLED_LINK',
    'RELOCATION_FAILED',
    'TOOL_UNAVAILABLE'
] as const;

export type NirvanaClosureReason = typeof NIRVANA_CLOSURE_REASONS[number];

export interface NirvanaClosureDependency {
    name: string;
    version: string;
}

export interface NirvanaClosureArtifact {
    file: string;
    sha256: string;
}

export interface NirvanaClosureSource {
    path: string;
    sha256: string;
}

export interface NirvanaClosurePackage {
    kind: 'nirvana' | 'vendor';
    name: string;
    version: string;
    artifact: NirvanaClosureArtifact;
    source: NirvanaClosureSource;
    dependencies: readonly NirvanaClosureDependency[];
}

export interface NirvanaDependencyClosureManifest {
    schemaVersion: 1;
    manifestId: 'watchtower-nirvana-closure/v1';
    ecosystem: {
        version: string;
        versionsRoot: string;
        manifestSha256: string;
    };
    registry: {
        external: string;
        nirvana: 'packed-artifacts';
    };
    watchtower: {
        name: 'watchtower';
        version: string;
        dependencies: readonly NirvanaClosureDependency[];
    };
    packages: readonly NirvanaClosurePackage[];
}

export interface NirvanaClosureFailure {
    ok: false;
    reason: NirvanaClosureReason;
    phase: 'validate' | 'resolve' | 'pack' | 'install' | 'verify';
    target: string;
    message: string;
}

export interface NirvanaClosureSuccess {
    ok: true;
    manifest: NirvanaDependencyClosureManifest;
    artifactsRoot: string;
    installPrefix?: string;
}

export type NirvanaClosureResult = NirvanaClosureSuccess | NirvanaClosureFailure;

export class NirvanaClosureError extends Error {
    constructor(
        readonly reason: NirvanaClosureReason,
        readonly phase: NirvanaClosureFailure['phase'],
        readonly target: string,
        message: string
    ) {
        super(message);
        this.name = 'NirvanaClosureError';
    }
}
