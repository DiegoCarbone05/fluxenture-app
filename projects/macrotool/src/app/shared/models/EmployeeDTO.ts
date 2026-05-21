interface IEmployeeDTO {
    id: string;
    name: string;
}

export class EmployeeDTO implements IEmployeeDTO {
    constructor(
        public id: string,
        public name: string,
        public employeeId?: number
    ) { }
}