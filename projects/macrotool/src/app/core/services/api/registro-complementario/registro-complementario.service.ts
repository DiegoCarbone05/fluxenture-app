import { Injectable } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { RegistroComplementario } from '../../../../shared/models/RegistroComplementario';

@Injectable({
  providedIn: 'root'
})
export class RegistroComplementarioService extends BaseApiService<RegistroComplementario> {
  protected override readonly endpoint = this.api + '/registros-complementarios';

  save(registro: RegistroComplementario) {
    return this.http.post<RegistroComplementario>(this.endpoint, registro);
  }

  getByEmployeeId(employeeId: string) {
    return this.http.get<RegistroComplementario[]>(`${this.endpoint}/employee/${employeeId}`);
  }

  /** null si el Doc todavia no tiene un RegistroComplementario cargado (404 del backend). */
  getByDocId(docId: string) {
    return this.http.get<RegistroComplementario>(`${this.endpoint}/doc/${docId}`);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
