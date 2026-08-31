import { ESector } from "./Employee";

interface IEmployeeDTO {
    id: string;
    name: string;
}

export class EmployeeDTO implements IEmployeeDTO {
    constructor(
        public id: string,
        public name: string,
        public employeeId?: number,
        // Campos de listado que devuelve GET /employees/ (ver EmployeeDTO del backend).
        // Son opcionales porque el DTO tambien se arma a mano en varios dialogos.
        public sector?: ESector,
        public isOperational?: boolean,
        public documentNumber?: string,
        public email?: string,
        public phone?: string,
        public cellPhone?: string,
        public entryDate?: string,
        /** Apellidos. Ausente en los registros previos al split de nombre. */
        public surname?: string,
        /** Servicio/objetivo asignado (texto libre, ver Employee.service). */
        public service?: string
    ) { }
}
