import { effect, Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { Employee } from '../../../../shared/models/Employee';
import { tap } from 'rxjs';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService extends BaseApiService<Employee> {
  protected override readonly endpoint = this.api + '/employees';

  private employees = signal<EmployeeDTO[]>([]);

  getEmployeesSignal(): Signal<EmployeeDTO[]> {
    return this.employees;
  }

  constructor() {
    super();
    this.refreshEmployees().subscribe();
  }

  refreshEmployees() {
    return this.http.get<EmployeeDTO[]>(this.endpoint + '/').pipe(
      tap((employees) => this.employees.set(employees))
    );
  }

  searchEmployees(query: string) {
    return this.http.get<Employee[]>(this.endpoint + '/search?name=' + query)
  }

  getEmployeeById(id: string) {
    return this.http.get<Employee>(this.endpoint + '/' + id);
  }

  getLocalEmployeeById(id: string) {
    return this.employees().find((employee) => employee.id === id)
  }

  /**
   * ABM
   */

  createEmployee(employee: Employee) {
    return this.http.post<Employee>(this.endpoint + '/', employee).pipe(
      tap(() => this.refreshEmployees().subscribe())
    );
  }

  deleteEmployee(id: string) {
    return this.http.delete<Employee>(this.endpoint + '/' + id).pipe(
      tap(() => this.refreshEmployees().subscribe())
    );
  }

  updateEmployee(id: string, employee: Employee) {
    return this.http.put<Employee>(this.endpoint + '/' + id, employee).pipe(
      tap(() => this.refreshEmployees().subscribe())
    );
  }
}
