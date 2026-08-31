import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Absent, AbsentType } from '../../../shared/models/Absent.model';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { AbsentService } from '../../../core/services/api/absents/absent.service';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { SelectDocDialog } from '../select-doc-dialog/select-doc-dialog';
import { ABSENT_TYPES, DOC_TYPES } from '../../../shared/constants/typesValues.constant';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';
import { fullNameOf } from '../../../shared/models/Employee';

export enum UploadStatus {
  IDLE,
  UPLOADING,
  SUCCESS,
  ERROR
}

@Component({
  selector: 'app-add-absent-dialog',
  standalone: true,
  imports: [
    CommonModule, AsyncPipe, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatDatepickerModule,
    MatCheckboxModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './add-absent-dialog.html',
  styleUrl: './add-absent-dialog.scss',
  providers: [provideNativeDateAdapter()]
})
export class AddAbsentDialog implements OnInit {

  UploadStatus = UploadStatus;
  uploadStatus = signal<UploadStatus>(UploadStatus.IDLE);
  errorMessage = signal<string>('');
  documentSelected = signal<Doc | null>(null);
  editMode = signal<boolean>(false);
  /** true solo si el documento se adjunto en esta sesion del dialog (no si ya venia de una ausencia existente). */
  private isNewlyAttachedDoc = signal(false);

  readonly dialog = inject(MatDialog);

  form = new FormGroup({
    employee: new FormControl<EmployeeDTO | null>(null, Validators.required),
    employeeId: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    startDate: new FormControl<Date | null>(null, Validators.required),
    endDate: new FormControl<Date | null>(null, Validators.required),
    observations: new FormControl(''),
    justified: new FormControl(false),
    file: new FormControl<string | null>(null),
  });

  absentTypes = ABSENT_TYPES;
  filteredEmployees!: Observable<EmployeeDTO[]>;
  employeeSelected!: EmployeeDTO;

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
      this.editMode.set(!!this.data.id);
      const emp = this.employeeService.getLocalEmployeeById(this.data.employeeId);
      if (emp) {
        this.employeeSelected = emp;
        this.form.patchValue({
          employee: emp as any,
          employeeId: emp.id ?? '',
        });
        if (this.data.originalStartDate && this.data.originalEndDate) {
          // Edicion completa de una ausencia existente: trae fechas/tipo/observaciones.
          this.form.patchValue({
            type: this.data.type,
            startDate: new Date(this.data.originalStartDate + 'T00:00:00'),
            endDate: new Date(this.data.originalEndDate + 'T00:00:00'),
            observations: this.data.observations,
            justified: this.data.justified
          });
        } else if (this.data.type) {
          // Alta nueva con tipo sugerido (ej: "Crear Ausencia" desde un documento en Documentos/Novedades).
          // Las fechas las define RRHH: no hay de donde inferirlas de forma confiable.
          this.form.patchValue({ type: this.data.type });
        }
      }
      if (this.data.docId) {
        this.docsSvc.getDoc(this.data.docId).subscribe({
          next: (doc) => {
            this.documentSelected.set(doc);
            this.form.get('file')?.setValue(doc.id ?? null);
          },
          error: (err) => console.error('No se pudo cargar el documento adjunto', err)
        });
      }
    }

    this.filteredEmployees = (this.form.get('employee')?.valueChanges as Observable<EmployeeDTO | null>).pipe(
      startWith(''),
      map((value) => {
        const employees = this.employeeService.getEmployeesSignal()();
        if (!value || value === '') return employees;
        const search = value.toString().toLowerCase();
        return employees.filter(emp =>
          fullNameOf(emp).toLowerCase().includes(search) ||
          String(emp.employeeId).toLowerCase().includes(search)
        );
      })
    );
  }


  addDocument() {
    const { employeeId, type } = this.form.value;
    if (!employeeId || !type) {
      this.snackBar.open('Seleccione un empleado y un tipo de ausencia antes de adjuntar', 'OK', { duration: 2500 });
      return;
    }

    const compatibleTypes = DOC_TYPES.map(t => t.value);
    let docType = compatibleTypes.includes(type as EDocType) ? type : EDocType.OTHER;

    switch (type) {
      case AbsentType.DESPIDO:
        docType = EDocType.CD;
        break;
      case AbsentType.RENUNCIA:
        docType = EDocType.TELEGRAMA;
        break;
    }

    const ref = this.dialog.open(SelectDocDialog, {
      disableClose: true,
      data: {
        employeeId,
        employee: this.employeeSelected,
        defaultUploadType: docType,
      }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.documentSelected.set(result);
      this.isNewlyAttachedDoc.set(true);
      this.form.get('file')?.setValue(result.id);
      this.form.get('file')?.markAsTouched();
    });
  }

  // Elimina el documento seleccionado de todos lados (Dialog, Drive y DB)
  deleteDocument() {
    const doc = this.documentSelected();
    if (!doc) return;
    // Se excluye esta misma ausencia del chequeo de uso: en edicion, la ausencia todavia
    // apunta a este doc en la DB hasta que se guarde, y no es un uso "de otro lado".
    this.docsSvc.deleteDocAndFile(doc.id ?? '', doc.driveFileId ?? '', { absentId: this.data?.id }).subscribe({
      next: () => {
        this.documentSelected.set(null);
        this.isNewlyAttachedDoc.set(false);
        this.form.get('file')?.setValue(null);
        this.form.get('file')?.markAsTouched();
        this.snackBar.open('Documento y archivo eliminado correctamente', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const msg = err?.status === 409
          ? 'Este documento tambien esta usado en otra ausencia u otro registro, no se puede eliminar'
          : 'Error borrando archivo';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
        console.error(err);
      }
    });
  }

  displayFn = (empOrStr: EmployeeDTO | string | null): string => {
    if (!empOrStr) return '';
    if (typeof empOrStr === 'object' && 'name' in empOrStr) return empOrStr.name;
    const employees = this.employeeService.getEmployeesSignal()();
    const found = employees.find(e => String(e.employeeId) === String(empOrStr));
    return found ? found.name : '';
  };

  onEmployeeSelected(event: any): void {
    const emp = event.option.value as EmployeeDTO;
    this.employeeSelected = emp;
    this.form.patchValue({
      // emp.id es el id real (Mongo) del empleado; emp.employeeId es el legajo, un numero
      // distinto que no sirve para buscar sus Docs (que se guardan con el id real).
      employeeId: emp.id,
      employee: emp as EmployeeDTO
    });
  }


  onSave(): void {
    if (this.form.valid && this.uploadStatus() === UploadStatus.IDLE) {
      this.uploadStatus.set(UploadStatus.UPLOADING);
      const { employee, type, startDate, endDate, observations, justified } = this.form.value;

      if (!employee || !type || !startDate || !endDate) {
        this.uploadStatus.set(UploadStatus.IDLE);
        return;
      }

      const payload = new Absent(
        employee.id,
        type as AbsentType,
        startDate.toISOString(),
        endDate.toISOString(),
        this.documentSelected()?.id || (this.data ? this.data.docId : ''),
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
          }, 1500);
        },
        error: (err) => {
          // Solo se borra si el documento se adjunto en esta sesion (no uno preexistente de una edicion).
          if (this.isNewlyAttachedDoc()) this.deleteDocument();
          this.uploadStatus.set(UploadStatus.ERROR);
          this.errorMessage.set(err?.error?.message || err?.message || 'Error al guardar la ausencia');
          setTimeout(() => {
            this.uploadStatus.set(UploadStatus.IDLE);
          }, 3000);
        }
      });

    }
  }

  onCancel(): void {
    // Idem: solo se borra si se adjunto en esta sesion, nunca un documento que ya existia.
    if (this.isNewlyAttachedDoc()) {
      this.deleteDocument();
    }
    this.dialogRef.close();
  }
}
