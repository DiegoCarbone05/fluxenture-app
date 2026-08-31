import { Component, signal , computed} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EmployeeHistoryService } from '../../../../core/services/api/employee-history/employee-history.service';
import { EmployeeHistory } from '../../../../shared/models/EmployeeHistory.model';
import { Employee, ESector } from '../../../../shared/models/Employee';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { EMPLOYEE_HISTORY_TYPES, EMPLOYEE_SECTOR } from '../../../../shared/constants/typesValues.constant';
import { ViewsService } from '../../../views.service';
import { Prompt } from '../../../dialogs/prompt/prompt';
import { CreateEmployeeHistoryDialogComponent } from '../../../dialogs/create-employee-history/create-employee-history';
import { MatDialog } from '@angular/material/dialog';
import { AddEmployee } from '../../../dialogs/add-employee/add-employee';
import { DocsService } from '../../../../core/services/api/docs/docs.service';
import { Doc } from '../../../../shared/models/Doc';
import { AddDocDialog } from '../../../dialogs/add-doc-dialog/add-doc-dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocTypePipe } from '../../../../shared/pipes/doc-type-pipe';
import { EmpSectorPipePipe } from '../../../../shared/pipes/emp-sector-pipe-pipe';
import { Toolbar } from '../../../../shared/components/toolbar/toolbar';
import { fullNameOf } from '../../../../shared/models/Employee';

@Component({
  selector: 'app-emp-view',
  standalone: true,
  imports: [
    CommonModule, DatePipe, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, DocTypePipe, EmpSectorPipePipe, Toolbar,
  ],
  templateUrl: './emp-view.html',
  styleUrl: './emp-view.scss'
})
export class EmpView {

  employeeHistory = signal<EmployeeHistory[]>([]);
  employee = signal<Employee | null>(null);
  employeeName = computed(() => fullNameOf(this.employee()));
  docs = signal<Doc[]>([]);
  employeeHistoryTypes = EMPLOYEE_HISTORY_TYPES;
  employeeSector = EMPLOYEE_SECTOR;

  constructor(
    private route: ActivatedRoute,
    private employeeHistoryService: EmployeeHistoryService,
    private employeeService: EmployeeService,
    private viewSvc: ViewsService,
    private docsService: DocsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.route.params.subscribe((params) => {
      const empId = params['id'];
      this.employeeHistoryService.getHistoryByEmployeeId(empId).subscribe((history) => {
        this.employeeHistory.set(history);
      });
      this.employeeService.getEmployeeById(empId).subscribe((employee) => {
        this.employee.set(employee);
      });
      this.docsService.getDocsByEmployeeId(empId).subscribe((docs) => {
        this.docs.set(docs);
      });
    });
  }

  // ── Docs ──────────────────────────────────────────────────────────────────

  loadDocs() {
    const id = this.employee()?.id;
    if (!id) return;
    this.docsService.getDocsByEmployeeId(id).subscribe((docs) => this.docs.set(docs));
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

  viewDoc(driveFileId: string) {
    if (!driveFileId) return;
    window.open(`https://drive.google.com/file/d/${driveFileId}/view`, '_blank');
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
