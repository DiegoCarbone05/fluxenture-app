import { AuditMetadata } from "./AuditMetadata";
import { Tnt } from "./Tnt.model";

export class Cd {
    id!: string;
    trackingNumber: number;
    emissionDate: string;
    employeeId: string;
    fileId: string;
    originalFileId?: string;
    /** Id del Doc (FluxDocs) que representa la carta original. Fuente de verdad para el merge de tracking. */
    docId?: string;
    public tnt!: Tnt[];
    obs: string;
    trackingCompleted: boolean;
    audit?: AuditMetadata;

    constructor(
        trackingNumber: number,
        emissionDate: string,
        employeeId: string,
        fileId: string,
        obs: string,
        trackingCompleted: boolean
    ) {
        this.trackingNumber = trackingNumber;
        this.emissionDate = emissionDate;
        this.employeeId = employeeId;
        this.fileId = fileId;
        this.obs = obs;
        this.trackingCompleted = trackingCompleted;
    }

}
