import { Component, OnInit, signal } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { Employee } from '../../../shared/models/Employee';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { StorageService } from '../../../core/services/storage/storage.service';
import { DocsService } from '../../../core/services/docs/docs.service';

export enum UploadStatus {
  IDLE,
  UPLOADING,
  SUCCESS,
  ERROR
}

@Component({
  selector: 'app-add-doc-dialog',
  standalone: false,
  templateUrl: './add-doc-dialog.html',
  styleUrl: './add-doc-dialog.scss',
  providers: [provideNativeDateAdapter()]
})
export class AddDocDialog implements OnInit {

  UploadStatus = UploadStatus;
  uploadStatus = signal<UploadStatus>(UploadStatus.IDLE);
  errorMessage = signal<string>('');

  form = new FormGroup({
    employee: new FormControl('', Validators.required),
    employeeId: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    date: new FormControl<Date | null>(null, Validators.required),
    description: new FormControl(''),
    file: new FormControl<File | null>(null, Validators.required),
  });

  docTypes = ['EPP', 'TELEGRAMA', 'ALTA_AFIP', 'CONTRATO', 'PREOCUPACIONAL', 'OTROS'];
  filteredEmployees!: Observable<Employee[]>;
  employeeSelected!: Employee;

  constructor(
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<AddDocDialog>,
    private storageService: StorageService,
    private docService: DocsService
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
      const { employeeId, type, description, file, date } = this.form.value;
      if (!employeeId || !type || !file || !date) return;

      //SUBE EL ARCHIVO
      this.storageService.uploadDoc(file, this.employeeSelected, type as EDocType).subscribe({
        next: (fileId: any) => {
          //CREA EL OBJETO DOC
          const payload = new Doc(
            employeeId,
            type as EDocType,
            fileId.response,
            date as Date,
            undefined,
            description!
          );
          console.log({ payload });

          //GUARDA EL DOC EN LA DB
          this.docService.saveDoc(payload).subscribe({
            next: (doc) => {
              this.dialogRef.close(doc);
            },
            error: (err) => {
              this.uploadStatus.set(UploadStatus.ERROR);
              this.errorMessage.set(err?.error.error ?? 'Error desconocido'); //Muestra el error del backend
              this.storageService.deleteFile(fileId.response).subscribe();//Borra el archivo si falla al guardar el doc

              setTimeout(() => {
                this.uploadStatus.set(UploadStatus.IDLE);
              }, 3000);
            }
          });
          this.uploadStatus.set(UploadStatus.SUCCESS);
          setTimeout(() => {
            this.dialogRef.close(payload);
          }, 3000);

        },
        error: (err) => {
          this.uploadStatus.set(UploadStatus.ERROR);
          this.errorMessage.set(err?.message ?? 'Error desconocido');
          setTimeout(() => {
            this.uploadStatus.set(UploadStatus.IDLE);
          }, 3000);
        }
      });
    }
  }

  saveDoc(doc: Doc) {

  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
