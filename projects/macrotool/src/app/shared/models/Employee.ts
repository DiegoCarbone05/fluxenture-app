import { AuditMetadata } from "./AuditMetadata";

export class Employee {
    id?: string;
    cuil: number = 0;
    name: string = '';
    employeeID: number = 0;
    isOperational: boolean = true;
    sector!: ESector;

    documentType: string = '';
    documentNumber: string = '';
    birthDate: string = '';
    gender: EGender = EGender.MALE;
    civilStatus: ECivilStatus = ECivilStatus.SINGLE;
    nationality: string = '';

    adress?: string;
    city: string = '';
    province: string = '';
    country: string = '';
    zipCode: string = '';

    phone?: string;
    cellPhone?: string;
    email: string = '';

    entryDate?: string;
    leaveDate?: string;

    audit?: AuditMetadata;

    constructor(init?: Partial<Employee>) {
        Object.assign(this, init);
    }
}

export enum EGender {
    MALE = 'M',
    FEMALE = 'F',
    OTHER = 'O'
}

export enum ECivilStatus {
    SINGLE = 'Soltero',
    MARRIED = 'Casado',
    DIVORCED = 'Divorciado',
    WIDOWED = 'Viudo',
    OTHER = 'Otro'
}


export enum ESector {
    DESMALEZADO = 'DESMALEZADO',
    CLEANING_OPERATOR = 'CLEANING_OPERATOR',
    ADMINISTRATION = 'ADMINISTRATION'
}