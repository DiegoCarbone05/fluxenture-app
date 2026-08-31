import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { Cd, trackingProductOf } from '../../../../shared/models/Cd.model';
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

  /**
   * Sube a Drive una foto del estado actual del seguimiento, fusionada con la carta original.
   * Devuelve la CD ya persistida: la primera sincronizacion le crea su propio PDF de salida
   * (fileId nuevo, distinto del archivo del Doc) y hay que quedarse con ese id.
   */
  syncTrackingSnapshot(id: string, snapshotBase64: string) {
    const formData = new FormData();
    formData.append('tnt', snapshotBase64);

    return this.http.post<Cd>(this.endpoint + '/' + id + '/export', formData).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  /** Consulta viva a Correo Argentino vía backend. No persiste nada. */
  trackByNumber(trackingNumber: number | string, product?: string) {
    const params = product ? { producto: product } : undefined;
    return this.http.get<Tnt[]>(this.endpoint + '/tracking/' + trackingNumber, { params });
  }

  /** Scrapea el seguimiento en el backend y lo persiste en la CD. Devuelve la CD actualizada. */
  refreshTracking(id: string) {
    return this.http.put<Cd>(this.endpoint + '/' + id + '/tracking', {}).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  /**
   * El numero solo no alcanza como identificador: dos productos distintos (CD/MD)
   * pueden repetirlo. Si se pasa el prefijo se filtra tambien por el; si no, se
   * devuelve la primera coincidencia (compatibilidad con links viejos sin prefijo).
   */
  getLocalCdByTrackingNumber(trackingNumber: number, product?: string) {
    const matches = this.cds().filter((cd) => cd.trackingNumber === trackingNumber);
    if (!product) return matches[0];
    return matches.find((cd) => trackingProductOf(cd) === product.toUpperCase()) ?? matches[0];
  }

  getCdsSignal() {
    return this.cds();
  }

}
