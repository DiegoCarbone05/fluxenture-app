import { Injectable } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { NovedadResponseDTO } from '../../../../shared/models/Novedad';

@Injectable({
  providedIn: 'root'
})
export class NovedadService extends BaseApiService<NovedadResponseDTO> {
  protected override readonly endpoint = this.api + '/novedades';

  getPending() {
    return this.http.get<NovedadResponseDTO[]>(`${this.endpoint}/pending`);
  }

  create(docId: string) {
    return this.http.post<unknown>(this.endpoint, { docId });
  }

  discard(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
