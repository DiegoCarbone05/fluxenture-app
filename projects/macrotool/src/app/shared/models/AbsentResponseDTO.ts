export interface AbsentResponseDTO {
    id: string;
    employeeId: string;
    type: string;
    justified: boolean;
    docId: string;
    originalStartDate: string;
    originalEndDate: string;
    impactDaysInMonth: number;
    observations: string;
}