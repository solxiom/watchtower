import type {StatusRuntimeView, StatusWarningCode} from '../../contracts/index.js';

/**
 * Runtime qualification remains unavailable until RT-02 provides the accepted
 * manifest/checksum validator. Directory names alone are never installation facts.
 */
export class StatusRuntimeInventory {
    observe(configured: string | null, warnings: StatusWarningCode[]): StatusRuntimeView {
        warnings.push('RUNTIME_INTEGRITY_UNAVAILABLE');
        return {
            qualification: 'unavailable', configured, installed: null,
            available: false, availableVersions: []
        };
    }
}

export interface StatusRuntimeSource {
    observe(configured: string | null, warnings: StatusWarningCode[]): StatusRuntimeView;
}
