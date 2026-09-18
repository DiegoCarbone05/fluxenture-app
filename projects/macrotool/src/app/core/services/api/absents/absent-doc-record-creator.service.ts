import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { Doc, EDocType } from '../../../../shared/models/Doc';
import { DocRecordCreator } from '../../../../shared/services/doc-record-creator';
import { AbsentType } from '../../../../shared/models/Absent.model';
import { AddAbsentDialog } from '../../../../views/dialogs/add-absent-dialog/add-absent-dialog';

// Tipos de documento que no tiene sentido convertir en una ausencia (equipamiento, altas/bajas
// AFIP, recibos, etc). Todo lo demas se deja pasar: RRHH termina de elegir/ajustar el tipo real
// de ausencia dentro del dialog, esto solo decide si el boton "Crear Ausencia" aparece o no.
const INCOMPATIBLE_TYPES = new Set<string>([
  EDocType.EPP,
  EDocType.ALTA_AFIP,
  EDocType.BAJA_AFIP,
  EDocType.PREOCUPACIONAL,
  EDocType.RECEIPT,
  EDocType.INCOME,
]);

@Injectable({ providedIn: 'root' })
export class AbsentDocRecordCreatorService implements DocRecordCreator {
  id = 'absent';
  label = 'Crear Ausencia';
  icon = 'event_busy';

  constructor(private dialog: MatDialog) { }

  isCompatible(doc: Doc): boolean {
    return !doc.type || !INCOMPATIBLE_TYPES.has(doc.type);
  }

  create(doc: Doc): Observable<any> {
    const ref = this.dialog.open(AddAbsentDialog, {
      disableClose: true,
      data: {
        employeeId: doc.employeeId,
        docId: doc.id,
        type: this.suggestType(doc.type),
      }
    });
    return ref.afterClosed();
  }

  private suggestType(docType: string | undefined): AbsentType | undefined {
    if (!docType) return undefined;
    switch (docType) {
      case EDocType.CD: return AbsentType.DESPIDO;
      case EDocType.TELEGRAMA: return AbsentType.RENUNCIA;
      default:
        return (Object.values(AbsentType) as string[]).includes(docType)
          ? (docType as unknown as AbsentType)
          : undefined;
    }
  }
}
