import { Component, OnInit, signal } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { Employee } from '../../../shared/models/Employee';
import { Absent, AbsentType } from '../../../shared/models/Absent.model';
import { StorageService } from '../../../core/services/storage/storage.service';
import { AbsentService } from '../../../core/services/absents/absent.service';
import { EDocType } from '../../../shared/models/Doc';

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

  absentTypes = [
    { value: AbsentType.VACATIONS, label: 'Vacaciones' },
    { value: AbsentType.MEDICAL, label: 'Médico' },
    { value: AbsentType.LICENSE, label: 'Licencia' },
    { value: AbsentType.SUSPENSION, label: 'Suspención' },
    { value: AbsentType.UNJUSTIFIED, label: 'Injustificado' },
    { value: AbsentType.FT, label: 'Feriado Trabajado' },
    { value: AbsentType.DT, label: 'Domingo Trabajado' },
    { value: AbsentType.DG, label: 'Dia Gremial' },
    { value: AbsentType.PG, label: 'Permiso Gremial' },
    { value: AbsentType.DESPIDO, label: 'Despido' },
    { value: AbsentType.RENUNCIA, label: 'Renuncia' },
    { value: AbsentType.FERIADO, label: 'Feriado' },
    { value: AbsentType.OTHER, label: 'Otro' }
  ];

  filteredEmployees!: Observable<Employee[]>;
  employeeSelected!: Employee;

  constructor(
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<AddAbsentDialog>,
    private storageService: StorageService,
    private absentService: AbsentService
  ) { }

  ngOnInit(): void {
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

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (file && allowedTypes.includes(file.type)) {
      this.form.patchValue({ file });
      this.form.get('file')?.markAsTouched();
    }
  }

  onSave(): void {
    if (this.form.valid && this.uploadStatus() === UploadStatus.IDLE) {
      this.uploadStatus.set(UploadStatus.UPLOADING);
      const { employeeId, type, startDate, endDate, observations, justified, file } = this.form.value;

      if (!employeeId || !type || !startDate || !endDate) return;

      const saveAbsent = (documentId: string = '') => {
        const payload = new Absent(
          employeeId,
          type as AbsentType,
          startDate.toISOString(),
          endDate.toISOString(),
          documentId,
          observations ?? '',
          justified ?? false
        );

        this.absentService.saveAbsent(payload).subscribe({
          next: (absent) => {
            console.log(absent);

            this.uploadStatus.set(UploadStatus.SUCCESS);
            setTimeout(() => {
              this.dialogRef.close(absent);
            }, 2000);
          },
          error: (err) => {
            this.uploadStatus.set(UploadStatus.ERROR);
            this.errorMessage.set(err?.error?.message || err?.message || 'Error al guardar la ausencia');
            if (documentId) {
              this.storageService.deleteFile(documentId).subscribe();
            }
            setTimeout(() => {
              this.uploadStatus.set(UploadStatus.IDLE);
            }, 3000);
          }
        });
      };

      if (file) {
        this.storageService.uploadDoc(file, this.employeeSelected, EDocType.OTROS).subscribe({
          next: (fileId: any) => {
            saveAbsent(fileId.response);
          },
          error: (err) => {
            this.uploadStatus.set(UploadStatus.ERROR);
            this.errorMessage.set(err?.message ?? 'Error al subir el archivo');
            setTimeout(() => {
              this.uploadStatus.set(UploadStatus.IDLE);
            }, 3000);
          }
        });
      } else {
        saveAbsent();
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
