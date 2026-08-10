import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { Doc, EDocType } from '../../../../shared/models/Doc';
import { DocRecordCreator } from '../../../../shared/services/doc-record-creator';
import { AddPdf } from '../../../../views/dialogs/add-pdf/add-pdf';

@Injectable({ providedIn: 'root' })
export class CdDocRecordCreatorService implements DocRecordCreator {
  id = 'cd';
  label = 'Crear CD (TNT)';
  icon = 'local_shipping';

  constructor(private dialog: MatDialog) { }

  // TNT solo tiene sentido a partir de una Carta Documento: es la unica conversion "dura" de esta
  // lista (a diferencia de Ausencia, que acepta casi cualquier tipo de documento).
  isCompatible(doc: Doc): boolean {
    return doc.type === EDocType.CD;
  }

  create(doc: Doc): Observable<any> {
    const ref = this.dialog.open(AddPdf, {
      disableClose: true,
      panelClass: 'custom-flex-dialog',
      data: { presetDoc: doc }
    });
    return ref.afterClosed();
  }
}
