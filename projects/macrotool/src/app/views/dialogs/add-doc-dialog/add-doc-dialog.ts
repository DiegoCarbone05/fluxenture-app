import { AfterViewInit, Component, computed, HostListener, Inject, OnInit, inject, signal } from '@angular/core';
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
import { Doc, extensionOf } from '../../../shared/models/Doc';
import { AuditMetadata } from '../../../shared/models/AuditMetadata';
import { DocUsages } from '../../../shared/models/DocUsages';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { DOC_USAGE_MODULE_LABELS } from '../../../shared/constants/typesValues.constant';
import { TipoDocumentoService } from '../../../core/services/api/tipo-documento/tipo-documento.service';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';
import { FileViewerDialog } from '../file-viewer-dialog/file-viewer-dialog';
import { fullNameOf } from '../../../shared/models/Employee';
import { ManageDocTypes } from '../manage-doc-types/manage-doc-types';
import { FullNamePipe } from '../../../shared/pipes/full-name-pipe';
import { filesFromClipboard } from '../../../shared/utils/clipboard-files';

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
    DragDropFileDirective, FullNamePipe,
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
  /** Extension del archivo ya cargado (edicion) - se preserva si no se reemplaza el archivo. */
  private existingExtension?: string;

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

  private tipoDocumentoService = inject(TipoDocumentoService);
  /** Si el tipo que ya trae este Doc (edicion) o que preseteo el caller (ej: T&T con "CD") quedo
   *  archivado despues, se lo sigue mostrando en la lista para no dejar el selector en blanco. */
  private extraTypeId = signal<string | undefined>(undefined);
  /** Catalogo dinamico (ver TipoDocumentoService) - reemplaza al viejo DOC_TYPES fijo. */
  docTypes = computed(() => {
    const active = this.tipoDocumentoService.activeTipos();
    const extraId = this.extraTypeId();
    if (extraId && !active.some(t => t.id === extraId)) {
      const extra = this.tipoDocumentoService.tipos().find(t => t.id === extraId);
      if (extra) return [...active, extra];
    }
    return active;
  });
  filteredEmployees!: Observable<EmployeeDTO[]>;
  employeeSelected!: EmployeeDTO;

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
            const emp = this.data.employee || this.employeeService.getLocalEmployeeById(doc.employeeId ?? ''); // Obtiene el empleado
            this.form.patchValue({
              employee: emp,
              employeeId: doc.employeeId,
              type: doc.type,
              date: doc.uploadDate,
              description: doc.description,
            });
            this.currentFileID.set(doc.driveFileId); // Se carga el id del archivo de drive
            this.existingAudit = doc.audit;
            this.existingExtension = doc.extension;
            this.extraTypeId.set(doc.type);
          },
          error: (err) => {
            console.error(err);
          }
        });
        this.docService.getDocUsages(this.data.editDocId).subscribe({
          next: (usages) => this.usages.set(usages),
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
        this.extraTypeId.set(this.data.type);
        this.form.get('type')?.disable();
      }
    }
  }

  /**
   * Ctrl+V con un archivo en el portapapeles (captura, imagen o archivo copiado del explorador)
   * lo carga igual que si se hubiera arrastrado. Antes se ignoraba el paste si el foco estaba en
   * un input de texto, y el dialogo abre con el foco en el buscador de empleado, asi que en la
   * practica no andaba. Ahora se decide por el contenido: si lo pegado es solo texto, sigue de
   * largo hacia el input con foco.
   */
  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    // Solo si este dialogo es el de arriba (no con el visor o el catalogo de tipos abiertos encima).
    if (this.dialog.openDialogs.at(-1) !== this.dialogRef) return;
    // En edicion, el archivo ya subido se quita primero con el tacho (onDeleteFile), igual que
    // para arrastrar uno nuevo: si no, el viejo quedaria huerfano en Drive.
    if (this.currentFileID()) return;

    const files = filesFromClipboard(event);
    if (files.length === 0) return;
    event.preventDefault(); // que no se pegue ademas el nombre del archivo como texto en el input
    if (this.addFiles(files[0])) this.fluxDocUploadMsg.set('Archivo pegado exitosamente');
  }

  onFileDropped(e: any) {
    const file = e as File
    if (this.addFiles(file)) this.fluxDocUploadMsg.set('Archivo arrastrado exitosamente');
  }

  ngAfterViewInit(): void {
  }

  displayFn = (empOrStr: EmployeeDTO | string | null): string => {
    if (!empOrStr) return '';
    if (typeof empOrStr === 'object' && 'name' in empOrStr) return fullNameOf(empOrStr);
    const employees = this.employeeService.getEmployeesSignal()();
    const found = employees.find(e => e.id === empOrStr || String(e.employeeId) === String(empOrStr));
    return fullNameOf(found);
  };

  /** Abre el catalogo de tipos sin perder lo ya completado; si se crea uno nuevo, lo autoselecciona. */
  manageTypes(): void {
    this.dialog.open(ManageDocTypes).afterClosed().subscribe((createdId?: string) => {
      if (createdId) this.form.patchValue({ type: createdId });
    });
  }

  onEmployeeSelected(event: any): void {
    const emp = event.option.value as EmployeeDTO;
    this.employeeSelected = emp;
    this.form.patchValue({
      // Id real (Mongo), igual que en alta con empleado preseleccionado y en edicion. Antes era el
      // legajo, que si el empleado no lo tenia cargado dejaba el form invalido.
      employeeId: emp.id,
      employee: emp as any
    });
  }

  /** Carga el archivo en el form si es de un tipo permitido. Devuelve si se acepto. */
  addFiles(file: File): boolean {
    // Coincide con el atributo `accept` del input y con el mensaje de error del template - antes
    // faltaban los mime types de Word, asi que un .docx pasaba el selector de archivos pero se
    // rechazaba en silencio aca (solo un console.error, sin feedback visible para el usuario).
    const allowedTypes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.type)) {
      this.form.patchValue({ file });
      this.form.get('file')?.markAsTouched();
      this.form.get('file')?.updateValueAndValidity(); // Asegura que el estado del formulario se refresque
      return true;
    }

    // Marcarlo como tocado muestra el mat-error con los formatos admitidos.
    this.form.get('file')?.markAsTouched();
    console.error('Tipo de archivo no permitido', file.type);
    return false;
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

    if (keepingExistingFile) {
      // Solo cambiaron metadatos (tipo/fecha/descripcion): no hace falta re-subir el archivo, asi
      // que la extension tampoco cambia.
      const payload = new Doc(employeeObject.id, type!, this.currentFileID(), date as Date, docId, description!, this.existingExtension);
      payload.audit = this.existingAudit; // preserva createdAt/createdBy al actualizar
      this.saveDocEntry(payload);
      return;
    }

    const extension = extensionOf(file!.name);
    this.storageService.uploadDoc(file!, this.employeeSelected, type!).subscribe({
      next: (fileId: any) => {
        const payload = new Doc(employeeObject.id, type!, fileId.response, date as Date, docId, description!, extension);
        payload.audit = this.existingAudit; // preserva createdAt/createdBy al actualizar (undefined si es alta nueva)
        this.saveDocEntry(payload, fileId.response);
      },
      error: (err) => {
        this.uploadStatus.set(UploadStatus.ERROR);
        this.errorMessage.set(err?.message ?? 'Error desconocido');
        setTimeout(() => this.uploadStatus.set(UploadStatus.IDLE), 3000);
      }
    });
  }

  private saveDocEntry(payload: Doc, uploadedFileId?: string): void {
    this.docService.saveDoc(payload).subscribe({
      next: (doc) => {
        this.uploadStatus.set(UploadStatus.SUCCESS);

        // Si se habia marcado un archivo viejo para reemplazo (onDeleteFile), se borra recien ahora que el guardado fue exitoso.
        if (this.tempFileID() !== '') {
          this.storageService.deleteFile(this.tempFileID()).subscribe();
        }

        setTimeout(() => {
          this.dialogRef.close(doc);
        }, 1500);
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


  onCancel(): void {
    this.dialogRef.close();
  }
}
