import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../base-api.service';
import { Cd } from '../../../shared/models/Cd.model';
import { tap } from 'rxjs';
import { Employee } from '../../../shared/models/Employee';

@Injectable({
  providedIn: 'root'
})
export class CdService extends BaseApiService<Cd>{
  protected override readonly endpoint = this.api + '/cds';

  private cds = signal<Cd[]>([]);

  constructor() {
    super();
    this.refreshCds().subscribe();
  }

  refreshCds() {
    return this.http.get<Cd[]>(this.endpoint+'/').pipe(
      tap((cds) => this.cds.set(cds))
    );
  }

  saveCd(cd: Cd) {
    return this.http.post<Cd>(this.endpoint+'/', cd).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  deleteCd(id: string) {
    return this.http.delete<Cd>(this.endpoint+'/'+id).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }
  
  putCd(cd: Cd) {
    return this.http.put<Cd>(this.endpoint+'/', cd).pipe(
      tap(() => this.refreshCds().subscribe())
    );
  }

  exportCd(tnt: string, fileId: string) {
    const formData = new FormData();
    formData.append('tnt', tnt);
    formData.append('fileId', fileId);
    
    return this.http.post<Cd>(this.endpoint+'/export', formData).pipe(
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
