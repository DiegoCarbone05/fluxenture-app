export class EmployeeHistory {
    id: string | undefined;
    date: Date = new Date();
    type: EEmployeeHistoryType = EEmployeeHistoryType.OTHER;
    employeeName: string;
    employeeId: string;
    description?: string;
    docId?: string;

    constructor(employeeName: string, employeeId: string, type: EEmployeeHistoryType, description?: string, docId?: string) {
        this.employeeName = employeeName;
        this.employeeId = employeeId;
        this.type = type;
        this.description = description;
        this.docId = docId;
    }
}

export enum EEmployeeHistoryType {
    ONBOARDING = 'ONBOARDING',
    OFFBOARDING = 'OFFBOARDING',
    RESIGNATION = 'RESIGNATION',
    DISMISSAL = 'DISMISSAL',
    SERVICE_CHANGE = 'SERVICE_CHANGE',
    SHIFT_CHANGE = 'SHIFT_CHANGE',
    OTHER = 'OTHER'
}
