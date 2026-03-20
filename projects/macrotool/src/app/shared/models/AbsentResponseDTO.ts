export interface AbsentResponseDTO {
    id: string;
    employeeId: string;
    type: string;
    justified: boolean;
    documentId: string;
    originalStartDate: string;
    originalEndDate: string;
    impactDaysInMonth: number;
}