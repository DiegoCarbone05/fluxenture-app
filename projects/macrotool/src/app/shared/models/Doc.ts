import { AuditMetadata } from "./AuditMetadata";

export class Doc {
    id?: string;
    employeeId: string;
    type: EDocType;
    driveFileId: string;
    uploadDate: Date;
    description?: string;
    user?: string;
    audit?: AuditMetadata;

    constructor(employeeId: string, type: EDocType, driveFileId: string, uploadDate: Date, id?: string, description?: string, user?: string) {
        this.id = id;
        this.employeeId = employeeId;
        this.type = type;
        this.driveFileId = driveFileId;
        this.uploadDate = uploadDate;
        this.description = description;
        this.user = user;
    }
}

export enum EDocType {
    // ----------------------------ABSENTS----------------------------
    MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
    VACATIONS = 'VACATIONS',
    CERTIFICATE = 'CERTIFICATE',
    SUSPENSION = 'SUSPENSION',
    LICENSE = 'LICENSE',
    OTHER = 'OTHER',
    DG = 'DG',
    PG = 'PG',

    // ----------------------------DOCUMENTS----------------------------
    CD = 'CD',
    EPP = 'EPP',
    TELEGRAMA = 'TELEGRAMA',
    ALTA_AFIP = 'ALTA_AFIP',
    PREOCUPACIONAL = 'PREOCUPACIONAL',
    APERCIBIMIENTO = 'APERCIBIMIENTO',
    ART = 'ART',
    NOTIFICATION = 'NOTIFICATION',

    //------------------

    RECEIPT = 'RECEIPT',
    INCOME = 'INCOME',
    BAJA_AFIP = 'BAJA_AFIP',

}
