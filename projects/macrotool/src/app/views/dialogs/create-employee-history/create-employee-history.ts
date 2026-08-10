import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { EmployeeHistoryService } from '../../../core/services/api/employee-history/employee-history.service';
import { EEmployeeHistoryType, EmployeeHistory } from '../../../shared/models/EmployeeHistory.model';
import { EMPLOYEE_HISTORY_TYPES } from '../../../shared/constants/typesValues.constant';
import { SelectDocDialog } from '../select-doc-dialog/select-doc-dialog';
import { EDocType } from '../../../shared/models/Doc';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';

@Component({
  selector: 'app-create-employee-history',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './create-employee-history.html',
  styleUrls: ['./create-employee-history.scss']
})
export class CreateEmployeeHistoryDialogComponent implements OnInit {
  historyForm: FormGroup;
  eventTypes = EMPLOYEE_HISTORY_TYPES;
  readonly addEmployeeDialog = inject(MatDialog);
  currentDocId = signal(null);
  private currentDriveFileId = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private historyService: EmployeeHistoryService,
    private dialogRef: MatDialogRef<CreateEmployeeHistoryDialogComponent>,
    private docService: DocsService,
    private employeeService: EmployeeService,
    private employeeHistoryService: EmployeeHistoryService,
    @Inject(MAT_DIALOG_DATA) public data: { employeeId: string }
  ) {
    this.historyForm = this.fb.group({
      date: [new Date().toISOString()],
      type: ['OTHER', Validators.required],
      employeeId: ['', Validators.required],
      employeeName: ['', Validators.required],
      description: [''],
      docId: [null, Validators.required]
    });
  }

  ngOnInit(): void {

    this.employeeService.getEmployeeById(this.data.employeeId).subscribe((emp) => {
      console.log(emp);
      if (this.data.employeeId && emp) {

        this.historyForm.patchValue({
          employeeName: emp.name,
          employeeId: emp.id
        })
      }
    });

  }

  get details(): FormArray {
    return this.historyForm.get('details') as FormArray;
  }

  addDocument() {

    let docType;

    switch (this.historyForm.get('type')?.value) {
      case (EEmployeeHistoryType.DISMISSAL):
        docType = EDocType.CD;
        break;
      case (EEmployeeHistoryType.RESIGNATION):
        docType = EDocType.TELEGRAMA;
        break;
      case (EEmployeeHistoryType.ONBOARDING):
        docType = EDocType.ALTA_AFIP;
        break;
      case (EEmployeeHistoryType.OFFBOARDING):
        docType = EDocType.BAJA_AFIP;
        break;
      case (EEmployeeHistoryType.SERVICE_CHANGE):
        docType = EDocType.NOTIFICATION;
        break;
      case (EEmployeeHistoryType.SHIFT_CHANGE):
        docType = EDocType.NOTIFICATION;
        break;
    }

    this.addEmployeeDialog.open(SelectDocDialog, {
      data: {
        employeeId: this.data.employeeId,
        defaultUploadType: docType
      },
      disableClose: true
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.historyForm.patchValue({
          docId: result.id
        })
        this.currentDriveFileId.set(result.driveFileId);

      }
    });
  }

  deleteFile() {
    const docId = this.historyForm.get('docId')?.value;
    if (!docId) return;
    // Este dialog es siempre de alta (no hay modo edicion para EmployeeHistory), asi que el doc
    // recien se adjunto en esta sesion: se borra tambien el archivo de Drive, no solo el registro.
    this.docService.deleteDocAndFile(docId, this.currentDriveFileId() ?? '').subscribe({
      next: () => {
        this.historyForm.patchValue({
          docId: null
        })
        this.currentDriveFileId.set(null);
      },
      error: (err) => {
        console.error('Error al eliminar el documento:', err);
      }
    });
  }

  addDetail() {
    const detailForm = this.fb.group({
      field: ['', Validators.required],
      oldValue: [''],
      newValue: ['']
    });
    this.details.push(detailForm);
  }

  removeDetail(index: number) {
    this.details.removeAt(index);
  }

  save() {
    if (this.historyForm.valid) {
      const history: EmployeeHistory = this.historyForm.value;
      console.log(history);

      this.historyService.saveHistory(history).subscribe({
        next: (savedRecord) => {
          this.dialogRef.close(savedRecord);
        },
        error: (err) => {
          console.error('Error al guardar el historial:', err);
          // Aquí se podría añadir un snackbar o alerta de error
        }
      });
    }
  }
}
