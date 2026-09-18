import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AbstentTypePipe } from '../../../../shared/pipes/abstent-type-pipe';
import { AbsentService } from '../../../../core/services/api/absents/absent.service';
import { ActivatedRoute } from '@angular/router';
import { AbsentResponseDTO } from '../../../../shared/models/AbsentResponseDTO';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';
import { AddAbsentDialog } from '../../../dialogs/add-absent-dialog/add-absent-dialog';
import { DocsService } from '../../../../core/services/api/docs/docs.service';
import { Doc } from '../../../../shared/models/Doc';
import { UtilsService } from '../../../../core/services/utils.service';

import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PillButton } from '../../../../shared/components/pill-button/pill-button';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { DocTile, DocGridRow } from '../../docs/doc-tile/doc-tile';

@Component({
  selector: 'app-absent-view',
  standalone: true,
  imports: [
    CommonModule, DatePipe, MatIconModule, AbstentTypePipe,
    PageHeader, PillButton, StatusChip, EmptyState, DocTile,
  ],
  templateUrl: './absent-view.html',
  styleUrl: './absent-view.scss'
})
export class AbsentView {

  absent = signal<AbsentResponseDTO | null>(null);
  employee = signal<EmployeeDTO | null>(null);
  attachedDoc = signal<Doc | undefined>(undefined);

  attachedDocRow = computed<DocGridRow | undefined>(() => {
    const doc = this.attachedDoc();
    if (!doc) return undefined;
    return {
      id: doc.id ?? '',
      description: doc.description || 'Comprobante de ausencia',
      typeId: doc.type,
      extension: doc.extension,
      blocked: false,
    };
  });

  private readonly dialog = inject(MatDialog);

  constructor(
    private absentService: AbsentService,
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private storageService: StorageService,
    private docsService: DocsService,
    private utilsSvc: UtilsService,
  ) {
    const id = this.route.snapshot.params['id'];
    const absent = this.absentService.getAbsentById(id);

    if (absent) {
      this.absent.set(absent);
      const employee = this.employeeService.getLocalEmployeeById(absent.employeeId);
      if (employee) {
        this.employee.set(employee);
      }
      if (absent.docId) {
        this.docsService.getDoc(absent.docId).subscribe((doc) => this.attachedDoc.set(doc));
      }
    }
  }

  editAbsent() {
    const dialogRef = this.dialog.open(AddAbsentDialog, {
      disableClose: true,
      data: this.absent()
    });
    dialogRef.afterClosed().subscribe((result: AbsentResponseDTO | undefined) => {
      if (result) {
        this.absent.set(result);
      }
    });
  }

  // `docId` guarda un Doc.id (FluxDocs), no un id de Drive directo.
  openFile(docId: string | undefined) {
    if (!docId) return;
    this.utilsSvc.openFile(docId);
  }

  downloadFile(docId: string | undefined) {
    if (!docId) return;
    this.docsService.getDoc(docId).subscribe({
      next: (doc) => this.downloadDriveFile(doc.driveFileId),
      error: () => this.downloadDriveFile(docId),
    });
  }

  private downloadDriveFile(driveFileId: string) {
    this.storageService.downloadFile(driveFileId).subscribe((res) => {
      const blob = new Blob([res], { type: res.type });
      const type = res.type.split("/")[1]
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DOC. DE AUSENCIA [${this.absent()?.type}] - ${this.employee()?.name} - [${this.absent()?.originalStartDate} - ${this.absent()?.originalEndDate}].${type}`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

}
