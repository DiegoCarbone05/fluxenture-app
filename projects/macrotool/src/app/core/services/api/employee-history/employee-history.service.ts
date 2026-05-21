import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { EmployeeHistory } from '../../../../shared/models/EmployeeHistory.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeHistoryService extends BaseApiService<EmployeeHistory> {
  protected override readonly endpoint = this.api + '/employee-history';

  constructor() {
    super();
  }

  saveHistory(history: EmployeeHistory) {
    return this.http.post<EmployeeHistory>(this.endpoint, history);
  }

  getHistoryByEmployeeId(employeeId: string) {
    return this.http.get<EmployeeHistory[]>(`${this.endpoint}/employee/id/${employeeId}`);
  }

  getHistoryByEmployeeName(employeeName: string) {
    return this.http.get<EmployeeHistory[]>(`${this.endpoint}/employee/name/${employeeName}`);
  }

  deleteHistory(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
