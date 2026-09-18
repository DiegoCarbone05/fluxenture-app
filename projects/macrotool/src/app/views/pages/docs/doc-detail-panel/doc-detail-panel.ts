import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Observable, map, startWith } from 'rxjs';

import { Doc } from '../../../../shared/models/Doc';
import { AuditMetadata } from '../../../../shared/models/AuditMetadata';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';
import { fullNameOf } from '../../../../shared/models/Employee';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { DocsService } from '../../../../core/services/api/docs/docs.service';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { TipoDocumentoService } from '../../../../core/services/api/tipo-documento/tipo-documento.service';
import { ManageDocTypes } from '../../../dialogs/manage-doc-types/manage-doc-types';
import { FileViewerDialog } from '../../../dialogs/file-viewer-dialog/file-viewer-dialog';
import { DOC_RECORD_CREATORS, DocRecordCreator } from '../../../../shared/services/doc-record-creator';
import { DocUsages } from '../../../../shared/models/DocUsages';
import { DOC_USAGE_MODULE_LABELS } from '../../../../shared/constants/typesValues.constant';
import { FluxFileIcon } from '../../../../shared/components/flux-file-icon/flux-file-icon';

/**
 * Panel lateral de un documento seleccionado. Edicion explicita (boton Guardar, sin
 * autoguardado por campo) — ver plan de Documentos → explorador de archivos.
 */
@Component({
  selector: 'app-doc-detail-panel',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatAutocompleteModule, MatDatepickerModule, MatTooltipModule,
    FluxFileIcon,
  ],
  templateUrl: './doc-detail-panel.html',
  styleUrl: './doc-detail-panel.scss',
  providers: [provideNativeDateAdapter()],
})
export class DocDetailPanel implements OnChanges {
  private readonly employeeService = inject(EmployeeService);
  private readonly docsService = inject(DocsService);
  private readonly storageService = inject(StorageService);
  private readonly tipoDocumentoService = inject(TipoDocumentoService);
  private readonly dialog = inject(MatDialog);
  readonly recordCreators = inject(DOC_RECORD_CREATORS);

  @Input({ required: true }) doc!: Doc;
  @Output() saved = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<Doc>();
  @Output() closed = new EventEmitter<void>();

  saving = signal(false);

  /** Si el tipo actual del doc quedo archivado, se lo sigue mostrando (mismo patron que AddDocDialog). */
  private extraTypeId = signal<string | undefined>(undefined);
  docTypes = computed(() => {
    const active = this.tipoDocumentoService.activeTipos();
    const extraId = this.extraTypeId();
    if (extraId && !active.some(t => t.id === extraId)) {
      const extra = this.tipoDocumentoService.tipos().find(t => t.id === extraId);
      if (extra) return [...active, extra];
    }
    return active;
  });

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

  form = new FormGroup({
    description: new FormControl<string>(''),
    employee: new FormControl<EmployeeDTO | string | null>(null),
    employeeId: new FormControl<string | null>(null),
    type: new FormControl<string | null>(null),
    date: new FormControl<Date | null>(null),
  });

  filteredEmployees!: Observable<EmployeeDTO[]>;
  private employeeSelected?: EmployeeDTO;
  private audit?: AuditMetadata;

  constructor() {
    this.filteredEmployees = (this.form.get('employee')?.valueChanges as Observable<string | EmployeeDTO | null>).pipe(
      startWith(''),
      map((value) => {
        const employees = this.employeeService.getEmployeesSignal()();
        if (!value || typeof value !== 'string') return employees;
        const search = value.toLowerCase();
        return employees.filter(emp =>
          fullNameOf(emp).toLowerCase().includes(search) ||
          String(emp.employeeId).toLowerCase().includes(search)
        );
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['doc']) this.patchFromDoc();
  }

  private patchFromDoc(): void {
    const doc = this.doc;
    const emp = doc.employeeId ? this.employeeService.getLocalEmployeeById(doc.employeeId) : undefined;
    this.employeeSelected = emp;
    this.audit = doc.audit;
    this.extraTypeId.set(doc.type);
    this.form.setValue({
      description: doc.description ?? '',
      employee: emp ?? null,
      employeeId: doc.employeeId ?? null,
      type: doc.type ?? null,
      date: doc.uploadDate ? new Date(doc.uploadDate) : null,
    });
    this.usages.set(null);
    if (doc.id) {
      this.docsService.getDocUsages(doc.id).subscribe({
        next: (usages) => this.usages.set(usages),
        error: () => { /* no bloquea el panel si falla */ },
      });
    }
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
    this.form.patchValue({ employeeId: String(emp.employeeId ?? ''), employee: emp as any });
  }

  clearEmployee(): void {
    this.employeeSelected = undefined;
    this.form.patchValue({ employee: null, employeeId: null });
  }

  manageTypes(): void {
    this.dialog.open(ManageDocTypes).afterClosed().subscribe((createdId?: string) => {
      if (createdId) this.form.patchValue({ type: createdId });
    });
  }

  /** Metodo (no computed): depende de `doc`, que es un @Input plano, no una signal. */
  isUnassigned(): boolean {
    return !this.doc.employeeId && !this.doc.empresaId;
  }

  creatorsFor(): DocRecordCreator[] {
    return this.recordCreators.filter(c => c.isCompatible(this.doc));
  }

  save(): void {
    if (this.saving()) return;
    const { description, employeeId, type, date } = this.form.getRawValue();

    const merged: Doc = { ...this.doc };
    merged.description = description || undefined;
    merged.employeeId = employeeId || undefined;
    merged.type = type || undefined;
    if (date) merged.uploadDate = date as any;
    merged.audit = this.audit;

    this.saving.set(true);
    this.docsService.saveDoc(merged).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        console.error('Error guardando documento', err);
        this.saving.set(false);
      }
    });
  }

  view(): void {
    this.dialog.open(FileViewerDialog, {
      panelClass: 'full-screen-dialog',
      data: { driveFileId: this.doc.driveFileId, title: this.doc.description },
    });
  }

  download(): void {
    this.storageService.downloadFile(this.doc.driveFileId).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (this.doc.description || 'documento') + (this.doc.extension ? '.' + this.doc.extension : '');
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  delete(): void {
    this.deleteRequested.emit(this.doc);
  }
}
