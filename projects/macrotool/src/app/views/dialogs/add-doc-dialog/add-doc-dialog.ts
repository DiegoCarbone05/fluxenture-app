import { AfterViewInit, Component, computed, ElementRef, HostListener, Inject, OnInit, inject, signal, ViewChild } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DragDropFileDirective } from '../../../shared/directives/drag-drop-file';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { AuditMetadata } from '../../../shared/models/AuditMetadata';
import { DocUsages } from '../../../shared/models/DocUsages';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { DOC_TYPES, DOC_USAGE_MODULE_LABELS } from '../../../shared/constants/typesValues.constant';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';
import { FileViewerDialog } from '../file-viewer-dialog/file-viewer-dialog';
import { fullNameOf } from '../../../shared/models/Employee';
import { RegistroComplementarioService } from '../../../core/services/api/registro-complementario/registro-complementario.service';
import { TipoRegistroComplementarioService } from '../../../core/services/api/tipo-registro-complementario/tipo-registro-complementario.service';
import { RegistroComplementario } from '../../../shared/models/RegistroComplementario';

// Nombre de modulo que usa el backend en DocUsages.byModule para el checker de RegistroComplementario
// (ver com.fluxenture.core.registrocomplementario.application.RegistroComplementarioDocUsageChecker.MODULE).
const REGISTRO_COMPLEMENTARIO_MODULE = 'registroComplementario';

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
  /** Audit del Doc que se esta editando, para no perder createdAt/createdBy al actualizar. */
  private existingAudit?: AuditMetadata;

  /** Quien usa este Doc (solo tiene sentido en edicion, un Doc nuevo todavia no lo usa nadie). */
  usages = signal<DocUsages | null>(null);
  usageEntries = computed(() => {
    const usages = this.usages();
    if (!usages) return [];
    return Object.entries(usages.byModule).map(([module, ids]) => ({
      module,
      label: DOC_USAGE_MODULE_LABELS[module] ?? module,
      count: ids.length,
    }));
  });

  // ── Registro Complementario ──────────────────────────────────────────────
  // Ningun Documento puede quedar "flotando" sin un Registro (Analitico o Complementario) que lo
  // sostenga (ver context-refactor-documentos.md). Cuando este dialog se abre para un alta que YA
  // va a quedar cubierta por un Registro Analitico (Ausencia/Historial/CD/Novedad - ver
  // SelectDocDialog.uploadNew() y absents.ts#uploadNovedad, que abren este mismo dialog con
  // `skipRegistroLink: true`), no hace falta pedir nada mas aca. En cualquier otro alta directa
  // (Documentos > Nuevo, LPO del legajo) se exige elegir un tipo de RegistroComplementario antes
  // de poder guardar.
  needsRegistroComplementario = signal(false);
  tiposRegistroComplementario = computed(() => this.tipoRegistroComplementarioService.activeTipos());
  /** Si el Doc en edicion YA tiene un RegistroComplementario, se actualiza en vez de duplicarlo. */
  private existingRegistroComplementarioId?: string;

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
    tipoRegistroComplementarioId: new FormControl(''),
    observaciones: new FormControl(''),
  });

  docTypes = DOC_TYPES;
  filteredEmployees!: Observable<EmployeeDTO[]>;
  employeeSelected!: EmployeeDTO;

  private registroComplementarioService = inject(RegistroComplementarioService);
  private tipoRegistroComplementarioService = inject(TipoRegistroComplementarioService);

  constructor(
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<AddDocDialog>,
    private storageService: StorageService,
    private docService: DocsService,
    private dialog: MatDialog,
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
          fullNameOf(emp).toLowerCase().includes(search) ||
          String(emp.employeeId).toLowerCase().includes(search)
        );
      })
    );

    // skipRegistroLink: lo pasa un caller que YA va a colgar el Doc resultante de un Registro
    // Analitico propio apenas se cierre este dialog (SelectDocDialog.uploadNew(), Novedad) - ver
    // comentario de needsRegistroComplementario mas arriba.
    const skipRegistroLink = !!this.data?.skipRegistroLink;
    if (!skipRegistroLink) {
      this.tipoRegistroComplementarioService.load().subscribe();
    }

    if (this.data) {

      /**
       * Edit Mode Case
       * Si recibe un ID de un objeto, lo carga para modificar
       */
      if (this.data.editDocId) {
        console.log("EDIT MODE");
        this.editMode.set(true);
        // En edicion ya existe un archivo cargado (currentFileID); solo es obligatorio si se reemplaza.
        this.form.get('file')?.clearValidators();
        this.form.get('file')?.updateValueAndValidity();
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
            this.existingAudit = doc.audit;
          },
          error: (err) => {
            console.error(err);
          }
        });
        this.docService.getDocUsages(this.data.editDocId).subscribe({
          next: (usages) => {
            this.usages.set(usages);
            if (skipRegistroLink) return;

            if (usages.byModule[REGISTRO_COMPLEMENTARIO_MODULE]?.length) {
              // Ya tiene un RegistroComplementario cargado: se edita ese, no se crea otro.
              this.requireTipoRegistroComplementario(true);
              this.registroComplementarioService.getByDocId(this.data.editDocId).subscribe({
                next: (registro) => {
                  this.existingRegistroComplementarioId = registro.id;
                  this.form.patchValue({
                    tipoRegistroComplementarioId: registro.tipoId,
                    observaciones: registro.observaciones ?? '',
                  });
                },
                error: (err) => console.error('No se pudo cargar el registro complementario', err)
              });
            } else if (Object.keys(usages.byModule).length === 0) {
              // Doc legado sin ningun Registro (previo a este refactor): se lo migra recien
              // ahora, forzando a elegir un tipo antes de poder guardar la edicion.
              this.requireTipoRegistroComplementario(true);
            }
            // Si ya esta cubierto por otro modulo (absent/employeeHistory/cd/novedad), no se pide nada mas.
          },
          error: (err) => console.error('No se pudo cargar donde esta usado el documento', err)
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

    // Cualquier otra alta directa (Documentos > Nuevo sin `data`, LPO del legajo con solo
    // `employeeId`) no tiene todavia ningun Registro esperando este Doc: se exige elegir un tipo
    // de RegistroComplementario antes de poder guardar.
    if (!skipRegistroLink) {
      this.requireTipoRegistroComplementario(true);
    }
  }

  private requireTipoRegistroComplementario(required: boolean): void {
    this.needsRegistroComplementario.set(required);
    const control = this.form.get('tipoRegistroComplementarioId');
    control?.setValidators(required ? [Validators.required] : []);
    control?.updateValueAndValidity();
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

  viewCurrentFile(): void {
    const file = this.form.value.file;
    if (this.currentFileID()) {
      this.dialog.open(FileViewerDialog, {
        panelClass: 'full-screen-dialog',
        data: { driveFileId: this.currentFileID(), title: this.form.value.description || undefined }
      });
    } else if (file) {
      this.dialog.open(FileViewerDialog, {
        panelClass: 'full-screen-dialog',
        data: { localFile: file, title: file.name }
      });
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
    if (!this.form.valid || this.uploadStatus() !== UploadStatus.IDLE) return;

    const { employeeId, type, description, file, date, employee } = this.form.getRawValue();

    // Fallback en caso de que employeeSelected no se haya seteado (por carga externa o error en el flujo)
    if (!this.employeeSelected && employee && typeof employee === 'object') {
      this.employeeSelected = employee as EmployeeDTO;
    }

    const hasNewFile = !!file;
    const keepingExistingFile = !hasNewFile && this.editMode() && !!this.currentFileID();

    if (!employeeId || !type || !date || !this.employeeSelected || (!hasNewFile && !keepingExistingFile)) {
      console.error('Faltan datos requeridos o el empleado no está seleccionado', { employeeId, type, file, date, employeeSelected: this.employeeSelected });
      return;
    }

    this.startFakeProgress();
    const employeeObject = employee as unknown as EmployeeDTO;
    // En edicion, se manda el id existente para que el backend actualice ese Doc en vez de crear uno nuevo.
    const docId = this.editMode() ? this.data?.editDocId : undefined;

    // Si esta alta va a crear un Doc nuevo (no una edicion sobre uno existente) y ademas ese Doc
    // no queda cubierto por ningun Registro Analitico externo, un fallo al crear el
    // RegistroComplementario tiene que deshacer el Doc (y el archivo) recien creados: no puede
    // quedar un Doc "flotando" sin Registro por un error a mitad de camino.
    const isNewDoc = !docId;

    if (keepingExistingFile) {
      // Solo cambiaron metadatos (tipo/fecha/descripcion): no hace falta re-subir el archivo.
      const payload = new Doc(employeeObject.id, type as EDocType, this.currentFileID(), date as Date, docId, description!);
      payload.audit = this.existingAudit; // preserva createdAt/createdBy al actualizar
      this.saveDocEntry(payload, undefined, isNewDoc);
      return;
    }

    this.storageService.uploadDoc(file!, this.employeeSelected, type as EDocType).subscribe({
      next: (fileId: any) => {
        const payload = new Doc(employeeObject.id, type as EDocType, fileId.response, date as Date, docId, description!);
        payload.audit = this.existingAudit; // preserva createdAt/createdBy al actualizar (undefined si es alta nueva)
        this.saveDocEntry(payload, fileId.response, isNewDoc);
      },
      error: (err) => {
        this.uploadStatus.set(UploadStatus.ERROR);
        this.errorMessage.set(err?.message ?? 'Error desconocido');
        setTimeout(() => this.uploadStatus.set(UploadStatus.IDLE), 3000);
      }
    });
  }

  private saveDocEntry(payload: Doc, uploadedFileId?: string, isNewDoc?: boolean): void {
    this.docService.saveDoc(payload).subscribe({
      next: (doc) => {
        if (!this.needsRegistroComplementario()) {
          this.finishSuccess(doc);
          return;
        }

        const { tipoRegistroComplementarioId, observaciones } = this.form.getRawValue();
        const registro: RegistroComplementario = {
          id: this.existingRegistroComplementarioId,
          employeeId: doc.employeeId,
          tipoId: tipoRegistroComplementarioId!,
          docId: doc.id!,
          fechaCarga: new Date().toISOString(),
          observaciones: observaciones || undefined,
        };
        this.registroComplementarioService.save(registro).subscribe({
          next: () => this.finishSuccess(doc),
          error: (err) => {
            // El Doc quedo creado pero sin Registro que lo sostenga: si es una alta nueva, se
            // deshace todo (Doc + archivo) en vez de dejarlo flotando. Si es una edicion sobre un
            // Doc que ya existia antes de este refactor, se deja el Doc como estaba.
            if (isNewDoc && doc.id) {
              this.docService.deleteDocAndFile(doc.id, doc.driveFileId).subscribe();
            }
            this.uploadStatus.set(UploadStatus.ERROR);
            this.errorMessage.set(err?.error?.error ?? err?.error ?? 'No se pudo guardar el registro complementario');
            setTimeout(() => this.uploadStatus.set(UploadStatus.IDLE), 3000);
          }
        });
      },
      error: (err) => {
        this.uploadStatus.set(UploadStatus.ERROR);
        this.errorMessage.set(err?.error?.error ?? 'Error desconocido');
        // Si se acababa de subir un archivo nuevo y el guardado del Doc fallo, se limpia el archivo huerfano.
        if (uploadedFileId) this.storageService.deleteFile(uploadedFileId).subscribe();

        setTimeout(() => {
          this.uploadStatus.set(UploadStatus.IDLE);
        }, 3000);
      }
    });

    this.completeProgress();
  }

  private finishSuccess(doc: Doc): void {
    this.uploadStatus.set(UploadStatus.SUCCESS);

    // Si se habia marcado un archivo viejo para reemplazo (onDeleteFile), se borra recien ahora que el guardado fue exitoso.
    if (this.tempFileID() !== '') {
      this.storageService.deleteFile(this.tempFileID()).subscribe();
    }

    setTimeout(() => {
      this.dialogRef.close(doc);
    }, 1500);
  }


  onCancel(): void {
    this.dialogRef.close();
  }
}
