import { AuditMetadata } from "./AuditMetadata";

export class Employee {
    id?: string;
    cuil: number = 0;
    /** Nombres de pila. Los registros previos al split todavia traen el nombre completo aca. */
    name: string = '';
    /** Apellidos. Ausente en los registros previos al split. */
    surname?: string;
    employeeID: number = 0;
    isOperational: boolean = true;
    sector!: ESector;
    /**
     * Servicio/objetivo al que esta asignado (el cliente para el que trabaja).
     * Texto libre y no enum: la cartera de clientes cambia sin necesidad de deploy.
     */
    service?: string;

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

/**
 * Nombre completo para mostrar, en el mismo orden que la nomina: APELLIDO NOMBRES.
 * Es importante que reproduzca exactamente el `name` viejo, porque la carpeta de
 * Drive de cada empleado se arma con este string (ver StorageService.uploadFileLPO).
 */
export function fullNameOf(employee: { name?: string; surname?: string } | null | undefined): string {
    if (!employee) return '';
    return [employee.surname, employee.name].filter(Boolean).join(' ').trim();
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