export class Absent {
    id!: string;
    employeeId: string;
    type: AbsentType;           // VACATIONS, MEDICAL, LICENSE, UNJUSTIFIED
    startDate: string;
    endDate: string;
    documentId: string;    // Google Drive File ID
    observations: string;
    justified: boolean;

    constructor(
        employeeId: string,
        type: AbsentType,
        startDate: string,
        endDate: string,
        documentId: string,
        observations: string,
        justified: boolean
    ) {
        this.employeeId = employeeId;
        this.type = type;
        this.startDate = startDate;
        this.endDate = endDate;
        this.documentId = documentId;
        this.observations = observations;
        this.justified = justified;
    }
}

export enum AbsentType {
    VACATIONS = 'VACATIONS',
    MEDICAL = 'MEDICAL',
    LICENSE = 'LICENSE',
    UNJUSTIFIED = 'UNJUSTIFIED',
    SUSPENSION = 'SUSPENSION',
    OTHER = 'OTHER',
    FT = 'FT',
    DT = 'DT',
    DG = 'DG',
    PG = 'PG',
    DESPIDO = 'DESPIDO',
    RENUNCIA = 'RENUNCIA',
    FERIADO = 'FERIADO'
}