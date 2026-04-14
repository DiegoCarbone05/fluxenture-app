import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { Employee } from '../../../shared/models/Employee';
import { Absent, AbsentType } from '../../../shared/models/Absent.model';
import { StorageService } from '../../../core/services/storage/storage.service';
import { AbsentService } from '../../../core/services/absents/absent.service';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { AddDocDialog } from '../add-doc-dialog/add-doc-dialog';
import { ABSENT_TYPES, DOC_TYPES } from '../../../shared/constants/typesValues.constant';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocsService } from '../../../core/services/docs/docs.service';

export enum UploadStatus {
  IDLE,
  UPLOADING,
  SUCCESS,
  ERROR
}

@Component({
  selector: 'app-add-absent-dialog',
  standalone: false,
  templateUrl: './add-absent-dialog.html',
  styleUrl: './add-absent-dialog.scss',
  providers: [provideNativeDateAdapter()]
})
export class AddAbsentDialog implements OnInit {

  UploadStatus = UploadStatus;
  uploadStatus = signal<UploadStatus>(UploadStatus.IDLE);
  errorMessage = signal<string>('');
  documentSelected = signal<Doc | null>(null);

  readonly dialog = inject(MatDialog);


  form = new FormGroup({
    employee: new FormControl('', Validators.required),
    employeeId: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    startDate: new FormControl<Date | null>(null, Validators.required),
    endDate: new FormControl<Date | null>(null, Validators.required),
    observations: new FormControl(''),
    justified: new FormControl(false),
    file: new FormControl<File | null>(null),
  });

  absentTypes = ABSENT_TYPES; // Lista de tipos
  filteredEmployees!: Observable<Employee[]>;
  employeeSelected!: Employee;

  constructor(
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<AddAbsentDialog>,
    private storageService: StorageService,
    private absentService: AbsentService,
    private docsSvc: DocsService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    if (this.data) {
      const emp = this.employeeService.getLocalEmployeeById(this.data.employeeId);
      if (emp) {
        this.employeeSelected = emp;
        this.form.patchValue({
          employee: emp as any,
          employeeId: emp.id ?? '',
          type: this.data.type,
          startDate: new Date(this.data.originalStartDate + 'T00:00:00'),
          endDate: new Date(this.data.originalEndDate + 'T00:00:00'),
          observations: this.data.observations,
          justified: this.data.justified
        });
      }
    }

    this.filteredEmployees = (this.form.get('employee')?.valueChanges as Observable<string>).pipe(
      startWith(''),
      map((value) => {
        const employees = this.employeeService.getEmployees();
        if (!value || value === '') return employees;
        const search = value.toString().toLowerCase();
        return employees.filter(emp =>
          emp.name.toLowerCase().includes(search) ||
          emp.employeeID.toString().includes(search)
        );
      })
    );
  }


  addDocument() {
    const { employeeId, type } = this.form.value;
    if (!employeeId || !type) return;

    const compatibleTypes = DOC_TYPES.map(t => t.value);

    let docType = compatibleTypes.includes(type as EDocType) ? type : EDocType.OTHER;


    //OMISIONES DE DOCUMENTOS PARA CIERTOS TIPOS DE AUSENCIAS
    switch (type) {
      case AbsentType.DESPIDO:
        docType = EDocType.CD;
        break;
      case AbsentType.RENUNCIA:
        docType = EDocType.TELEGRAMA;
        break;
    }
    //

    console.log(docType);

    const ref = this.dialog.open(AddDocDialog, {
      disableClose: true,
      data: {
        employeeId,
        employee: this.employeeSelected,
        type: docType,
      }
    });
    ref.afterClosed().subscribe(result => {
      this.documentSelected.set(result);
      this.form.get('file')?.setValue(result.id);
      this.form.get('file')?.markAsTouched();
    });
  }

  //NOTA: ESTA FUNCION DEBE SER REVISADA Y ESTANDARIZADA
  /**
   * Elimina el documento seleccionado de todos lados (Dialog, Drive y DB)
   */
  deleteDocument() {
    if (!this.documentSelected()) return;
    this.docsSvc.deleteDocAndFile(this.documentSelected()?.id ?? '', this.documentSelected()?.driveFileId ?? '').subscribe({
      next: () => {
        this.documentSelected.set(null);
        this.form.get('file')?.setValue(null);
        this.form.get('file')?.markAsTouched();
        this.snackBar.open('Documento y archivo eliminado correctamente', 'OK', { duration: 2000 });
      },
      error: (err) => {
        this.snackBar.open('Error borrando archivo', 'OK', { duration: 2000 });
        console.error(err);
      }
    });
  }

  displayFn = (empOrStr: Employee | string | null): string => {
    if (!empOrStr) return '';
    if (typeof empOrStr === 'object' && 'name' in empOrStr) return empOrStr.name;
    const employees = this.employeeService.getEmployees();
    const found = employees.find(e => e.id === empOrStr || String(e.employeeID) === String(empOrStr));
    return found ? found.name : '';
  };

  onEmployeeSelected(event: any): void {
    const emp = event.option.value as Employee;
    this.employeeSelected = emp;
    this.form.patchValue({
      employeeId: emp.id ?? '',
      employee: emp as any
    });
  }


  onSave(): void {
    if (this.form.valid && this.uploadStatus() === UploadStatus.IDLE) {
      this.uploadStatus.set(UploadStatus.UPLOADING);
      const { employeeId, type, startDate, endDate, observations, justified, file } = this.form.value;

      if (!employeeId || !type || !startDate || !endDate) return;

      const saveAbsent = () => {
        const payload = new Absent(
          employeeId,
          type as AbsentType,
          startDate.toISOString(),
          endDate.toISOString(),
          this.documentSelected()?.id || (this.data ? this.data.documentId : ''),
          observations ?? '',
          justified ?? false
        );

        if (this.data && this.data.id) {
          payload.id = this.data.id;
        }

        this.absentService.saveAbsent(payload).subscribe({
          next: (absent) => {
            this.uploadStatus.set(UploadStatus.SUCCESS);
            setTimeout(() => {
              this.dialogRef.close(absent);
            }, 2000);
          },
          error: (err) => {
            this.deleteDocument() //BORRA EL DOCUMENTIO DE DRIVE
            this.uploadStatus.set(UploadStatus.ERROR);
            this.errorMessage.set(err?.error?.message || err?.message || 'Error al guardar la ausencia');
            setTimeout(() => {
              this.uploadStatus.set(UploadStatus.IDLE);
            }, 3000);
          }
        });
      };

      saveAbsent();

    }
  }

  onCancel(): void {
    this.deleteDocument() //BORRA EL DOCUMENTIO DE DRIVE
    this.dialogRef.close();
  }
}
