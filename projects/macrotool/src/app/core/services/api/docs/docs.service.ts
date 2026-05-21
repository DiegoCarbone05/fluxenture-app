import { Injectable } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { Doc } from '../../../../shared/models/Doc';
import { MatDialog } from '@angular/material/dialog';
import { AddDocDialog } from '../../../../views/dialogs/add-doc-dialog/add-doc-dialog';

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

  getDoc(id: string) {
    return this.http.get<Doc>(`${this.endpoint + id}`);
  }

  getDocById(id: string) {
    return this.http.get<Doc>(`${this.endpoint + id}`);
  }

  saveDoc(doc: Doc) {
    return this.http.post<Doc>(this.endpoint, doc);
  }

  deleteDocAndFile(id: string, fileId: string) {
    return this.http.delete<string>(this.endpoint + id + "/" + fileId)
  }

  deleteDoc(id: string) {
    return this.http.delete<string>(this.endpoint + id)
  }

  openDialog(data: any) {
    this.dialog.open(AddDocDialog, {
      data: data,
      disableClose: true,
      panelClass: 'full-screen-dialog',
    });
  }
}
