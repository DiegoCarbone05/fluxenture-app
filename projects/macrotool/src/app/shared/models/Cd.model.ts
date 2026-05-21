import { AuditMetadata } from "./AuditMetadata";
import { Tnt } from "./Tnt.model";

export class Cd {
    id!: string;
    trackingNumber: number;
    emissionDate: string;
    employeeId: string;
    fileId: string;
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
