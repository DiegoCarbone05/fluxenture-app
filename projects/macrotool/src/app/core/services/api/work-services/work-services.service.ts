import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { BaseApiService } from '../../base-api.service';
import { WorkService } from '../../../../shared/models/WorkService';

@Injectable({ providedIn: 'root' })
export class WorkServicesService extends BaseApiService<WorkService> {
  protected override readonly endpoint = this.api + '/services';

  private services = signal<WorkService[]>([]);

  constructor() {
    super();
    this.refresh().subscribe();
  }

  refresh() {
    return this.http.get<WorkService[]>(this.endpoint + '/').pipe(
      tap((list) => this.services.set(list))
    );
  }

  getServicesSignal() {
    return this.services();
  }

  /** Solo los vigentes: es lo que se ofrece al asignar un empleado. */
  getActiveServices() {
    return this.services().filter((s) => s.active);
  }

  create(name: string) {
    return this.http.post<WorkService>(this.endpoint + '/', { name }).pipe(
      tap(() => this.refresh().subscribe())
    );
  }

  /** Renombra y arrastra a los empleados que lo tenian asignado. */
  rename(id: string, name: string) {
    return this.http.put<WorkService>(`${this.endpoint}/${id}`, { name }).pipe(
      tap(() => this.refresh().subscribe())
    );
  }

  setActive(id: string, value: boolean) {
    return this.http.put<WorkService>(`${this.endpoint}/${id}/active?value=${value}`, {}).pipe(
      tap(() => this.refresh().subscribe())
    );
  }

  countEmployeesUsing(id: string) {
    return this.http.get<{ employees: number }>(`${this.endpoint}/${id}/usages`);
  }

  /** Arma la lista con los servicios que los empleados ya tienen escritos. Idempotente. */
  seedFromEmployees() {
    return this.http.post<{ serviciosCreados: number; empleadosLimpiados: number }>(
      this.endpoint + '/seed', {}
    ).pipe(tap(() => this.refresh().subscribe()));
  }
}
