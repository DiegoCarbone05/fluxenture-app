import { Component, HostListener, signal, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { EmployeeHistoryService } from '../../../../core/services/api/employee-history/employee-history.service';
import { EmployeeHistory } from '../../../../shared/models/EmployeeHistory.model';
import { Employee, ESector } from '../../../../shared/models/Employee';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { EMPLOYEE_HISTORY_TYPES, EMPLOYEE_SECTOR } from '../../../../shared/constants/typesValues.constant';
import { ViewsService } from '../../../views.service';
import { UtilsService } from '../../../../core/services/utils.service';
import { CreateEmployeeHistoryDialogComponent } from '../../../dialogs/create-employee-history/create-employee-history';
import { MatDialog } from '@angular/material/dialog';
import { AddEmployee } from '../../../dialogs/add-employee/add-employee';
import { DocsService } from '../../../../core/services/api/docs/docs.service';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { Doc, extensionOf } from '../../../../shared/models/Doc';
import { AddDocDialog } from '../../../dialogs/add-doc-dialog/add-doc-dialog';
import { FileViewerDialog } from '../../../dialogs/file-viewer-dialog/file-viewer-dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmpSectorPipePipe } from '../../../../shared/pipes/emp-sector-pipe-pipe';
import { fullNameOf } from '../../../../shared/models/Employee';

import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PillButton } from '../../../../shared/components/pill-button/pill-button';
import { IconButton } from '../../../../shared/components/icon-button/icon-button';
import { SearchBox } from '../../../../shared/components/search-box/search-box';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { DragDropFileDirective } from '../../../../shared/directives/drag-drop-file';
import { filesFromClipboard } from '../../../../shared/utils/clipboard-files';
import { DocTile, DocGridRow } from '../../docs/doc-tile/doc-tile';
import { DocDetailPanel } from '../../docs/doc-detail-panel/doc-detail-panel';

interface EmpDocRow extends DocGridRow {
  uploadDateMs: number;
  raw: Doc;
}

@Component({
  selector: 'app-emp-view',
  standalone: true,
  imports: [
    CommonModule, DatePipe, ReactiveFormsModule, MatTooltipModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatSidenavModule, EmpSectorPipePipe,
    PageHeader, PillButton, IconButton, SearchBox, EmptyState,
    DragDropFileDirective, DocTile, DocDetailPanel,
  ],
  templateUrl: './emp-view.html',
  styleUrl: './emp-view.scss'
})
export class EmpView {

  private readonly viewSvc = inject(ViewsService);
  private readonly utilsSvc = inject(UtilsService);
  private readonly storageService = inject(StorageService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  employeeHistory = signal<EmployeeHistory[]>([]);
  employee = signal<Employee | null>(null);
  employeeName = computed(() => fullNameOf(this.employee()));
  docs = signal<Doc[]>([]);
  employeeHistoryTypes = EMPLOYEE_HISTORY_TYPES;
  employeeSector = EMPLOYEE_SECTOR;

  // ── Documentos (explorador tipo Docs, acotado a este empleado) ─────────────
  docSearchControl = new FormControl<string>('');
  private docTerm = signal<string>('');
  docsDesc = signal<boolean>(true);
  docsSortLabel = computed(() => (this.docsDesc() ? 'Recientes' : 'Antiguos'));
  uploadingDocs = signal(false);

  selectedDocId = signal<string | undefined>(undefined);
  selectedDoc = computed<Doc | undefined>(() => this.docs().find((d) => d.id === this.selectedDocId()));
  docDetailOpen = computed(() => !!this.selectedDoc());

  private docRows = computed<EmpDocRow[]>(() => this.docs().map((doc) => ({
    id: doc.id ?? '',
    description: doc.description || 'Sin nombre',
    typeId: doc.type,
    extension: doc.extension,
    blocked: false,
    uploadDateMs: new Date(doc.uploadDate).getTime(),
    raw: doc,
  })));

  filteredDocRows = computed<EmpDocRow[]>(() => {
    const term = this.docTerm().trim().toLowerCase();
    const result = term
      ? this.docRows().filter((row) => row.description.toLowerCase().includes(term) || (row.extension || '').toLowerCase().includes(term))
      : this.docRows();
    const desc = this.docsDesc();
    return [...result].sort((a, b) => (desc ? b.uploadDateMs - a.uploadDateMs : a.uploadDateMs - b.uploadDateMs));
  });

  constructor(
    private route: ActivatedRoute,
    private employeeHistoryService: EmployeeHistoryService,
    private employeeService: EmployeeService,
    private docsService: DocsService,
  ) {
    this.docSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => this.docTerm.set(value?.trim() ?? ''));

    this.route.params.subscribe((params) => {
      const empId = params['id'];
      this.employeeHistoryService.getHistoryByEmployeeId(empId).subscribe((history) => {
        this.employeeHistory.set(history);
      });
      this.employeeService.getEmployeeById(empId).subscribe((employee) => {
        this.employee.set(employee);
      });
      this.loadDocs(empId);
    });
  }

  // ── Docs ──────────────────────────────────────────────────────────────────

  loadDocs(employeeId?: string) {
    const id = employeeId ?? this.employee()?.id;
    if (!id) return;
    this.docsService.getDocsByEmployeeId(id).subscribe((docs) => this.docs.set(docs));
  }

  toggleDocsSort() {
    this.docsDesc.update((value) => !value);
  }

  addDoc() {
    const ref = this.dialog.open(AddDocDialog, {
      disableClose: true,
      panelClass: 'full-screen-dialog',
      data: { employeeId: this.employee()?.id }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadDocs();
    });
  }

  onDocTileClick(event: { id: string }): void {
    this.selectedDocId.set(event.id);
  }

  closeDocDetail(): void {
    this.selectedDocId.set(undefined);
  }

  openDocFile(doc: Doc): void {
    this.dialog.open(FileViewerDialog, {
      panelClass: 'full-screen-dialog',
      data: { driveFileId: doc.driveFileId, title: doc.description || this.utilsSvc.getDocFullName(doc.type) }
    });
  }

  onDocDetailSaved(): void {
    this.snackBar.open('Documento actualizado', 'OK', { duration: 2000 });
    this.loadDocs();
  }

  onDocDetailDeleteRequested(doc: Doc): void {
    this.closeDocDetail();
    this.deleteDoc(doc);
  }

  /** Sube archivos soltados directamente sobre la grilla, ya asociados a este empleado. */
  onDocsDropped(files: File[]): void {
    const employee = this.employee();
    if (files.length === 0 || !employee?.id || this.uploadingDocs()) return;
    this.uploadingDocs.set(true);
    this.snackBar.open(
      files.length === 1 ? 'Subiendo archivo…' : `Subiendo ${files.length} archivos…`,
      undefined,
      { duration: undefined }
    );

    const employeeDto = this.toEmployeeDto(employee);
    const uploads = files.map((file) =>
      this.storageService.uploadDoc(file, employeeDto).pipe(
        switchMap((res: any) => {
          const payload: Doc = {
            employeeId: employee.id,
            driveFileId: res.response,
            extension: extensionOf(file.name),
            uploadDate: new Date(),
            description: file.name,
          } as Doc;
          return this.docsService.saveDoc(payload);
        }),
        map(() => ({ ok: true, name: file.name })),
        catchError((err) => {
          console.error('Error subiendo archivo', file.name, err);
          return of({ ok: false, name: file.name });
        })
      )
    );

    forkJoin(uploads).subscribe((results) => {
      this.uploadingDocs.set(false);
      const okCount = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok).map((r) => r.name);
      const msg = failed.length === 0
        ? `${okCount} ${okCount === 1 ? 'archivo subido' : 'archivos subidos'}`
        : `${okCount} de ${results.length} subidos · fallaron: ${failed.join(', ')}`;
      this.snackBar.open(msg, 'OK', { duration: 4000 });
      this.loadDocs();
    });
  }

  /** Ctrl+V con archivos en el portapapeles = subirlos a este empleado, igual que el drop.
   *  Si lo pegado es solo texto se deja pasar normal. */
  @HostListener('document:paste', ['$event'])
  onDocumentPaste(event: ClipboardEvent): void {
    if (this.dialog.openDialogs.length > 0) return; // con un dialogo abierto, el paste es de el
    const files = filesFromClipboard(event);
    if (files.length === 0) return;
    event.preventDefault();
    this.onDocsDropped(files);
  }

  private toEmployeeDto(e: Employee): EmployeeDTO {
    return new EmployeeDTO(e.id ?? '', e.name, e.employeeID, e.sector, e.isOperational, e.documentNumber, e.email, e.phone, e.cellPhone, e.entryDate, e.surname, e.service);
  }

  deleteDoc(doc: Doc) {
    this.viewSvc.prompt('Eliminar documento', '¿Está seguro de que desea eliminar este documento?').then((confirmed) => {
      if (!confirmed) return;
      this.docsService.deleteDocAndFile(doc.id!, doc.driveFileId).subscribe({
        next: () => this.loadDocs(),
        error: (err) => {
          const msg = err?.status === 409
            ? 'Este documento esta en uso (ausencia u otro registro), no se puede eliminar'
            : 'Error al eliminar el documento';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      });
    });
  }

  // ── History ───────────────────────────────────────────────────────────────

  addHistory() {
    const dialog = this.dialog.open(CreateEmployeeHistoryDialogComponent, {
      panelClass: 'full-screen-dialog',
      data: { employeeId: this.employee()?.id },
      disableClose: true
    });

    dialog.afterClosed().subscribe((result: EmployeeHistory | undefined) => {
      if (result) {
        this.employeeHistory.update((history) => [...history, result]);
        // Un Alta/Baja puede haber actualizado entryDate/leaveDate/isOperational
        // del lado del backend (ver SaveEmployeeHistoryUseCase): se refresca el
        // empleado para que esta vista y la tabla de Empleados lo reflejen ya.
        this.employeeService.refreshOne(result.employeeId).subscribe((employee) => {
          this.employee.set(employee);
        });
      }
    });
  }

  editEmployee() {
    const dialog = this.dialog.open(AddEmployee, {
      panelClass: 'full-screen-dialog',
      data: { employee: this.employee() },
      disableClose: true
    });

    dialog.afterClosed().subscribe((result: Employee | undefined) => {
      if (result) {
        this.employeeService.updateEmployee(this.employee()?.id!, result).subscribe(() => {
          this.employee.set(result);
        });
      }
    });
  }

  getEmployeeHistoryTypeLabel(type: string): string {
    const typeFound = this.employeeHistoryTypes.find((t) => t.value === type);
    return typeFound ? typeFound.label : type;
  }

  getEmployeeSectorLabel(sector: ESector | undefined): string {
    if (!sector) return '';

    const sectorFound = this.employeeSector.find((s) => s.value === sector);
    return sectorFound ? sectorFound.label : sector.toString();
  }

  viewHistory(item: EmployeeHistory) {
    if (item.docId) {
      this.viewSvc.openDriveFile(item.docId);
    }
  }

  deleteHistory(item: EmployeeHistory) {
    if (item.id) {
      this.viewSvc.prompt('Eliminar historial', '¿Está seguro de que desea eliminar este historial?').then((result) => {
        if (result) {
          this.employeeHistoryService.deleteHistory(item.id!).subscribe(() => {
            this.employeeHistory.update((history) => history.filter((h) => h.id !== item.id));
          });
        }
      });
    }
  }

}
