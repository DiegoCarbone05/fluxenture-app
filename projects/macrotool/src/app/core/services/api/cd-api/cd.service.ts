import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { Cd } from '../../../../shared/models/Cd.model';
import { tap } from 'rxjs';
import { Employee } from '../../../../shared/models/Employee';
import { Tnt } from '../../../../shared/models/Tnt.model';

@Injectable({
  providedIn: 'root'
})
export class CdService extends BaseApiService<Cd> {
  protected override readonly endpoint = this.api + '/cds';

  private cds = signal<Cd[]>([]);

  constructor() {
    super();
    this.refreshCds().subscribe();
  }

  refreshCds() {
    return this.http.get<Cd[]>(this.endpoint + '/').pipe(
      tap((cds) => this.cds.set(cds))
    );
  }

  saveCd(cd: Cd) {
    return this.http.post<Cd>(this.endpoint + '/', cd).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  deleteCd(id: string) {
    return this.http.delete<Cd>(this.endpoint + '/' + id).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  putCd(cd: Cd) {
    return this.http.put<Cd>(this.endpoint + '/', cd).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  /** Sube a Drive una foto del estado actual del seguimiento, fusionada con la carta original. */
  syncTrackingSnapshot(id: string, snapshotBase64: string) {
    const formData = new FormData();
    formData.append('tnt', snapshotBase64);

    return this.http.post<void>(this.endpoint + '/' + id + '/export', formData).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  /** Consulta viva a Correo Argentino vía backend. No persiste nada. */
  trackByNumber(trackingNumber: number | string) {
    return this.http.get<Tnt[]>(this.endpoint + '/tracking/' + trackingNumber);
  }

  /** Scrapea el seguimiento en el backend y lo persiste en la CD. Devuelve la CD actualizada. */
  refreshTracking(id: string) {
    return this.http.put<Cd>(this.endpoint + '/' + id + '/tracking', {}).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  getLocalCdByTrackingNumber(trackingNumber: number) {
    return this.cds().find((cd) => cd.trackingNumber === trackingNumber);
  }

  getCdsSignal() {
    return this.cds();
  }

}
