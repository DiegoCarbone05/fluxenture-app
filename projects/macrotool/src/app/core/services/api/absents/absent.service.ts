import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { Absent } from '../../../../shared/models/Absent.model';
import { tap } from 'rxjs/operators';
import { AbsentResponseDTO } from '../../../../shared/models/AbsentResponseDTO';

@Injectable({
  providedIn: 'root'
})
export class AbsentService extends BaseApiService<Absent> {
  protected override readonly endpoint = this.api + '/absents';

  private absents = signal<Absent[]>([]);
  private absentResponseDTO = signal<AbsentResponseDTO[]>([]);

  constructor() {
    super();
  }

  getAbsentsSignal(): Signal<Absent[]> {
    return this.absents;
  }

  getAbsentsResponseDTO(): Signal<AbsentResponseDTO[]> {
    return this.absentResponseDTO;
  }

  saveAbsent(absent: Absent) {
    return this.http.post<Absent>(this.endpoint, absent).pipe(
      tap(() => this.refreshAbsents())
    );
  }

  getAbsentsByMonth(year: number, month: number) {
    return this.http.get<AbsentResponseDTO[]>(`${this.endpoint}/month/${year}/${month}`).pipe(
      tap(absents => this.absentResponseDTO.set(absents))
    );
  }

  getAbsentById(id: string) {
    return this.absentResponseDTO().find(absent => absent.id === id);
  }

  getAbsentsByEmployee(employeeId: string) {
    return this.http.get<AbsentResponseDTO[]>(`${this.endpoint}/employee/${employeeId}`).pipe(
      tap(absents => this.absentResponseDTO.set(absents))
    );
  }

  deleteAbsent(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${id}`).pipe(
      tap(() => this.refreshAbsents())
    );
  }

  // Refresh depends on the current view. If we typically refresh by month, 
  // you might need to pass year/month, or keep track of the current month.
  // For now, an abstract refresh function can be left for components to re-fetch manually.
  refreshAbsents() {
    // Implementing a dummy refresh or leave it empty, as the API needs (year, month) or employeeId
  }
}
