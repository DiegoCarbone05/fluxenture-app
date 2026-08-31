import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { Employee } from '../../../../shared/models/Employee';
import { Observable, Subscriber, tap } from 'rxjs';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';

/** Tamaño de cada tanda al traer el listado completo (ver refreshEmployees). */
const PAGE_SIZE = 100;

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

  /**
   * Trae a todos los empleados en tandas de PAGE_SIZE en vez de un solo pedido
   * con la plantilla entera (puede ser >800 registros): la tabla ya puede
   * pintar con la primera tanda mientras el resto sigue llegando en segundo
   * plano, y cada pedido HTTP individual queda chico.
   */
  refreshEmployees(): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.employees.set([]);
      this.loadPage(0, subscriber);
    });
  }

  private loadPage(page: number, subscriber: Subscriber<void>): void {
    this.http.get<EmployeeDTO[]>(`${this.endpoint}/page?page=${page}&size=${PAGE_SIZE}`).subscribe({
      next: (batch) => {
        this.employees.update((current) => [...current, ...batch]);
        if (batch.length === PAGE_SIZE) {
          this.loadPage(page + 1, subscriber);
        } else {
          subscriber.next();
          subscriber.complete();
        }
      },
      error: (err) => subscriber.error(err),
    });
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
   * Vuelve a traer un empleado puntual y actualiza su entrada en el cache
   * local, sin refetchear los demas. Uso tipico: despues de cargar un evento
   * de Alta/Baja en el historial, que el backend usa para actualizar
   * entryDate/leaveDate/isOperational del lado del empleado (ver
   * SaveEmployeeHistoryUseCase) sin que quien llamo lo sepa.
   */
  refreshOne(id: string) {
    return this.getEmployeeById(id).pipe(
      tap((employee) => {
        const dto = this.toDTO(employee);
        this.employees.update((current) => current.map((e) => (e.id === id ? dto : e)));
      })
    );
  }

  /**
   * ABM
   */

  // Alta/baja/edicion parchean el cache local con la respuesta del propio pedido
  // en vez de volver a traer los 800 empleados: por eso ya no llaman a
  // refreshEmployees().

  createEmployee(employee: Employee) {
    return this.http.post<Employee>(this.endpoint + '/', employee).pipe(
      tap((created) => this.employees.update((current) => [...current, this.toDTO(created)]))
    );
  }

  deleteEmployee(id: string) {
    return this.http.delete<Employee>(this.endpoint + '/' + id).pipe(
      tap(() => this.employees.update((current) => current.filter((e) => e.id !== id)))
    );
  }

  updateEmployee(id: string, employee: Employee) {
    return this.http.put<Employee>(this.endpoint + '/' + id, employee).pipe(
      tap((updated) => {
        const dto = this.toDTO({ ...updated, id: updated.id ?? id });
        this.employees.update((current) => current.map((e) => (e.id === id ? dto : e)));
      })
    );
  }

  /** El alta/edicion devuelve el Employee completo; se recorta al DTO liviano que usa el cache local. */
  private toDTO(employee: Employee): EmployeeDTO {
    return new EmployeeDTO(
      employee.id ?? '',
      employee.name,
      employee.employeeID,
      employee.sector,
      employee.isOperational,
      employee.documentNumber,
      employee.email,
      employee.phone,
      employee.cellPhone,
      employee.entryDate,
      employee.surname,
      employee.service,
    );
  }
}
