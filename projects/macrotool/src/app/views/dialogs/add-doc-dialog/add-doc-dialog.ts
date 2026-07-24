import { AfterViewInit, Component, ElementRef, HostListener, Inject, OnInit, signal, ViewChild } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { DragDropFileDirective } from '../../../shared/directives/drag-drop-file';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { DOC_TYPES } from '../../../shared/constants/typesValues.constant';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';

export enum UploadStatus {
  IDLE,
  UPLOADING,
  SUCCESS,
  ERROR
}

@Component({
  selector: 'app-add-doc-dialog',
  standalone: true,
  imports: [
    CommonModule, AsyncPipe, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatDatepickerModule, MatProgressBarModule,
    DragDropFileDirective,
  ],
  templateUrl: './add-doc-dialog.html',
  styleUrl: './add-doc-dialog.scss',
  providers: [provideNativeDateAdapter()]
})
export class AddDocDialog implements OnInit, AfterViewInit {

  UploadStatus = UploadStatus;
  uploadStatus = signal<UploadStatus>(UploadStatus.IDLE);
  errorMessage = signal<string>('');
  currentFileID = signal<string>('');
  tempFileID = signal<string>(''); //Al querer borrar el archivo para subir otro, guarda el id del archivo a borrar
  editMode = signal(false)
  fluxDocUploadMsg = signal<string>('');

  deleteOrden = signal<boolean>(false);

  //Progress
  progress = signal<number>(0);
  private progressInterval: any;
  //

  form = new FormGroup({
    employee: new FormControl('', Validators.required),
    employeeId: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    date: new FormControl<Date | null>(null, Validators.required),
    description: new FormControl(''),
    file: new FormControl<File | null>(null, Validators.required),
  });

  docTypes = DOC_TYPES;
  filteredEmployees!: Observable<EmployeeDTO[]>;
  employeeSelected!: EmployeeDTO;

  constructor(
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<AddDocDialog>,
    private storageService: StorageService,
    private docService: DocsService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: any

  ) { }

  ngOnInit(): void {

    this.filteredEmployees = (this.form.get('employee')?.valueChanges as Observable<string>).pipe(
      startWith(''),
      map((value) => {
        const employees = this.employeeService.getEmployeesSignal()();
        if (!value || value === '') return employees;
        const search = value.toString().toLowerCase();
        return employees.filter(emp =>
          emp.name.toLowerCase().includes(search) ||
          String(emp.employeeId).toLowerCase().includes(search)
        );
      })
    );

    if (this.data) {

      /**
       * Edit Mode Case
       * Si recibe un ID de un objeto, lo carga para modificar
       */
      if (this.data.editDocId) {
        console.log("EDIT MODE");
        this.editMode.set(true);
        this.docService.getDocById(this.data.editDocId).subscribe({
          next: (doc) => {
            const emp = this.data.employee || this.employeeService.getLocalEmployeeById(doc.employeeId); // Obtiene el empleado
            this.form.patchValue({
              employee: emp,
              employeeId: doc.employeeId,
              type: doc.type,
              date: doc.uploadDate,
              description: doc.description,
            });
            this.currentFileID.set(doc.driveFileId); // Se carga el id del archivo de drive
          },
          error: (err) => {
            console.error(err);
          }
        });

        return
      }

      /**
       * Create Mode Case
       * Si no recibe un ID de un objeto, lo carga para crear
       * Esto es para cuando se quiere cargar un archivo de un empleado ya seleccionado previamente
       */
      if (this.data.employeeId) {
        console.log("CREATE MODE - SECCTION EMPLOYEE ID");
        const emp = this.data.employee || this.employeeService.getLocalEmployeeById(this.data.employeeId); // Obtiene el empleado
        if (emp) {
          this.employeeSelected = emp;
          this.form.patchValue({
            employee: emp as any,
            employeeId: emp.id ?? '',
          });

          console.log(this.form.value);

          this.form.get('employee')?.disable();
          this.form.get('employeeId')?.disable();
        }
      }


      if (this.data.type) {
        this.form.patchValue({
          type: this.data.type,
        });
        this.form.get('type')?.disable();
      }
    }
  }

  // Escucha el evento 'paste' en todo el componente
  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    // Opcional: Si el usuario está escribiendo en el campo 'description', no queremos capturar el paste aquí
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' && target.getAttribute('type') === 'text') {
      return;
    }

    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            this.addFiles(file);
            this.fluxDocUploadMsg.set('Archivo pegado exitosamente');
            break; // Nos aseguramos de tomar solo el primer archivo del portapapeles
          }
        }
      }
    }
  }

  onFileDropped(e: any) {
    const file = e as File
    this.fluxDocUploadMsg.set('Archivo arrastrado exitosamente');
    this.addFiles(file)
  }

  ngAfterViewInit(): void {
  }

  displayFn = (empOrStr: EmployeeDTO | string | null): string => {
    if (!empOrStr) return '';
    if (typeof empOrStr === 'object' && 'name' in empOrStr) return empOrStr.name;
    const employees = this.employeeService.getEmployeesSignal()();
    const found = employees.find(e => e.id === empOrStr || String(e.employeeId) === String(empOrStr));
    return found ? found.name : '';
  };

  onEmployeeSelected(event: any): void {
    const emp = event.option.value as EmployeeDTO;
    this.employeeSelected = emp;
    this.form.patchValue({
      employeeId: String(emp.employeeId ?? ''),
      employee: emp as any
    });
  }

  addFiles(file: File) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.type)) {
      this.form.patchValue({ file });
      this.form.get('file')?.markAsTouched();
      this.form.get('file')?.updateValueAndValidity(); // Asegura que el estado del formulario se refresque
      console.log(this.form.value);

    } else {
      // Opcional: podrías setear el errorMessage() aquí si el tipo no es válido
      console.error('Tipo de archivo no permitido');
    }
  }

  startFakeProgress() {
    this.progress.set(0);

    this.progressInterval = setInterval(() => {
      const current = this.progress();
      let increment = 0;

      if (current < 40) {
        increment = Math.random() * 10; // Rápido al principio
      } else if (current < 80) {
        increment = Math.random() * 3;  // Velocidad media
      } else if (current < 95) {
        increment = Math.random() * 0.5; // Muy lento al final
      }

      if (current + increment < 98) {
        this.progress.set(current + increment);
      }
    }, 200); // Se actualiza cada 200ms
  }

  completeProgress() {
    clearInterval(this.progressInterval);
    this.progress.set(100);
  }

  resetProgress() {
    clearInterval(this.progressInterval);
    this.progress.set(0);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.addFiles(file);
    }
  }

  onDeleteFile() {
    this.form.patchValue({ file: null });
    this.form.get('file')?.markAsTouched();
    this.form.get('file')?.updateValueAndValidity();


    /**
     * Si se está editando un documento, se guarda el id del documento a borrar y se limpia el currentFileID
     * para que se pueda subir el nuevo archivo
     */
    if (this.editMode()) {
      this.tempFileID.set(this.currentFileID());
      this.currentFileID.set('');
    }
  }

  onSave(): void {
    if (this.form.valid && this.uploadStatus() === UploadStatus.IDLE) {
      this.startFakeProgress()
      const { employeeId, type, description, file, date, employee } = this.form.getRawValue();

      // Fallback en caso de que employeeSelected no se haya seteado (por carga externa o error en el flujo)
      if (!this.employeeSelected && employee && typeof employee === 'object') {
        this.employeeSelected = employee as EmployeeDTO;
      }

      if (!employeeId || !type || !file || !date || !this.employeeSelected) {
        console.error('Faltan datos requeridos o el empleado no está seleccionado', { employeeId, type, file, date, employeeSelected: this.employeeSelected });
        return;
      }

      console.log("SUBE EL ARCHIVO");

      //SUBE EL ARCHIVO
      this.storageService.uploadDoc(file, this.employeeSelected, type as EDocType).subscribe({
        next: (fileId: any) => {
          //CREA EL OBJETO DOC
          console.log("CREA EL OBJETO DOC, " + this.employeeSelected);

          const employeeObject = employee as unknown as EmployeeDTO;

          const payload = new Doc(
            employeeObject.id,
            type as EDocType,
            fileId.response,
            date as Date,
            undefined,
            description!,
            this.authService.getUserSignal()()?.username
          );

          //GUARDA EL DOC EN LA DB
          console.log("GUARDA EN LA DB");
          this.docService.saveDoc(payload).subscribe({
            next: (doc) => {
              this.uploadStatus.set(UploadStatus.SUCCESS);

              if (this.tempFileID() !== '') {
                this.storageService.deleteFile(this.tempFileID()).subscribe();
              }

              setTimeout(() => {
                this.dialogRef.close(doc);
              }, 1500);
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


          this.completeProgress()
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


  onCancel(): void {
    this.dialogRef.close();
  }
}
