import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { BaseApiService } from '../../base-api.service';
import { Doc } from '../../../../shared/models/Doc';
import { DocUsages } from '../../../../shared/models/DocUsages';
import { MatDialog } from '@angular/material/dialog';
import { AddDocDialog } from '../../../../views/dialogs/add-doc-dialog/add-doc-dialog';

/** Al borrar un Doc que el propio caller tiene adjunto (ej: reemplazar el archivo de una ausencia en
 *  edicion), se excluye esa misma referencia del chequeo de uso para no bloquearse a si mismo. */
export interface DeleteDocExclude {
  absentId?: string;
  historyId?: string;
  registroComplementarioId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocsService extends BaseApiService<string> {
  protected override readonly endpoint = this.api + '/docs/';

  constructor(private dialog: MatDialog) {
    super();
  }

  getDocs() {
    return this.http.get<Doc[]>(this.endpoint);
  }

  getDocsByEmployeeId(employeeId: string) {
    return this.http.get<Doc[]>(`${this.endpoint}employee/${employeeId}`);
  }

  getDoc(id: string) {
    return this.http.get<Doc>(`${this.endpoint + id}`);
  }

  getDocById(id: string) {
    return this.http.get<Doc>(`${this.endpoint + id}`);
  }

  getDocUsages(id: string) {
    return this.http.get<DocUsages>(`${this.endpoint + id}/usages`);
  }

  /**
   * Descarga masiva: el back baja los archivos de Drive y devuelve un unico ZIP,
   * con cada archivo renombrado como dice `files[].name` (la extension la pone el back
   * a partir del archivo real). Se manda por POST porque la seleccion puede ser larga.
   */
  exportZip(zipName: string, files: { docId: string; name: string }[]) {
    return this.http.post(`${this.endpoint}export/zip`, { zipName, files }, { responseType: "blob" });
  }

  saveDoc(doc: Doc) {
    return this.http.post<Doc>(this.endpoint, doc);
  }

  deleteDocAndFile(id: string, fileId: string, exclude?: DeleteDocExclude) {
    return this.http.delete<string>(this.endpoint + id + "/" + fileId, { params: this.excludeParams(exclude) })
  }

  deleteDoc(id: string, exclude?: DeleteDocExclude) {
    return this.http.delete<string>(this.endpoint + id, { params: this.excludeParams(exclude) })
  }

  private excludeParams(exclude?: DeleteDocExclude): HttpParams {
    let params = new HttpParams();
    if (exclude?.absentId) params = params.set('excludeAbsentId', exclude.absentId);
    if (exclude?.historyId) params = params.set('excludeHistoryId', exclude.historyId);
    if (exclude?.registroComplementarioId) params = params.set('excludeRegistroComplementarioId', exclude.registroComplementarioId);
    return params;
  }

  openDialog(data: any) {
    this.dialog.open(AddDocDialog, {
      data: data,
      disableClose: true,
      panelClass: 'full-screen-dialog',
    });
  }
}
