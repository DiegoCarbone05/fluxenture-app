export class Doc {
    id?: string;
    employeeId: string;
    type: EDocType;
    driveFileId: string;
    uploadDate: Date;
    description?: string

    constructor(employeeId: string, type: EDocType, driveFileId: string, uploadDate: Date, id?: string, description?: string,) {
        this.id = id;
        this.employeeId = employeeId;
        this.type = type;
        this.driveFileId = driveFileId;
        this.uploadDate = uploadDate;
        this.description = description;
    }
}

export enum EDocType {
    EPP = 'EPP',
    TELEGRAMA = 'TELEGRAMA',
    ALTA_AFIP = 'ALTA_AFIP',
    CONTRATO = 'CONTRATO',
    PREOCUPACIONAL = 'PREOCUPACIONAL',
    VACATIONS = 'VACATIONS',
    MEDIC_CERRT = 'MEDIC_CERRT',
    LICENCE = 'LICENCE',
    OTROS = 'OTROS',
    APERCIBIMIENTO = 'APERCIBIMIENTO'
}
