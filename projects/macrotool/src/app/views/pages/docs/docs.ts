import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { DocTypePipe } from '../../../shared/pipes/doc-type-pipe';
import { AddDocDialog } from '../../dialogs/add-doc-dialog/add-doc-dialog';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { ESector, fullNameOf } from '../../../shared/models/Employee';
import { Prompt } from '../../dialogs/prompt/prompt';
import { DatepickerDialog } from '../../dialogs/datepicker-dialog/datepicker-dialog';
import { MONTHS } from '../../../shared/constants/general-constant';
import { DOC_TYPES } from '../../../shared/constants/typesValues.constant';
import { AppService } from '../../../core/services/app.service';
import { UtilsService } from '../../../core/services/utils.service';
import { ViewsService } from '../../views.service';
import { FileViewerDialog } from '../../dialogs/file-viewer-dialog/file-viewer-dialog';
import { DOC_RECORD_CREATORS, DocRecordCreator } from '../../../shared/services/doc-record-creator';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PillButton } from '../../../shared/components/pill-button/pill-button';
import { IconButton } from '../../../shared/components/icon-button/icon-button';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { TableToolbar } from '../../../shared/components/table-toolbar/table-toolbar';
import { EmployeeCell } from '../../../shared/components/employee-cell/employee-cell';
import { RowActions } from '../../../shared/components/row-actions/row-actions';
import { TablePager } from '../../../shared/components/table-pager/table-pager';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { M3SearchBar } from '../../../shared/components/m3-search-bar/m3-search-bar';
import { M3ListItem } from '../../../shared/components/m3-list-item/m3-list-item';
import { FabButton } from '../../../shared/components/fab-button/fab-button';

type TypeFilter = 'todos' | EDocType;

/** Fila ya derivada para la vista: evita repetir lookups dentro del template. */
interface DocRow {
  id: string;
  employeeName: string;
  employeeNameTitle: string;
  employeeInitials: string;
  employeeLegajo: string;
  employeeSector?: ESector;
  type: EDocType;
  description: string;
  dateLabel: string;
  uploadDateMs: number;
  userLabel: string;
  raw: Doc;
}

const PAGE_SIZE = 12;

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule, RouterLink,
    DocTypePipe, PageHeader, PillButton, IconButton, SearchBox, TableToolbar,
    EmployeeCell, RowActions, TablePager, EmptyState, M3SearchBar, M3ListItem,
    FabButton,
  ],
  templateUrl: './docs.html',
  styleUrl: './docs.scss'
})
export class Docs implements OnInit {

  readonly dialog = inject(MatDialog);
  readonly recordCreators = inject(DOC_RECORD_CREATORS);

  isMobile = computed(() => this.viewsSvc.getIsMobile());
  user = computed(() => this.authService.getUserSignal()());
  userInitials = computed(() => (this.user()?.username ?? '').slice(0, 2).toUpperCase());

  readonly months = MONTHS;
  readonly docTypes = DOC_TYPES;
  readonly pageSize = PAGE_SIZE;

  currentDate = computed(() => this.appSvc.dateOfData());
  monthLabel = computed(() => `${this.months[this.currentDate().month - 1]} ${this.currentDate().year}`);

  docs = signal<Doc[]>([]);
  isLoading = signal(true);

  searchFormControl = new FormControl<string>('');

  // ── Estado de filtros ───────────────────────────────────────────────────────
  term = signal<string>('');
  typeFilter = signal<TypeFilter>('todos');
  desc = signal<boolean>(true);
  page = signal<number>(0);

  private rows = computed<DocRow[]>(() => this.docs().map((doc) => this.toRow(doc)));

  filtered = computed<DocRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    const type = this.typeFilter();

    const result = this.rows().filter((row) => {
      if (type !== 'todos' && row.type !== type) return false;
      if (term) {
        const haystack = [row.employeeName, row.description, row.userLabel].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const desc = this.desc();
    return result.sort((a, b) => (desc ? b.uploadDateMs - a.uploadDateMs : a.uploadDateMs - b.uploadDateMs));
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const start = Math.max(0, Math.min(this.currentPage() - 1, total - 3));
    return Array.from({ length: Math.min(3, total) }, (_, i) => start + i);
  });

  paged = computed(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return 'Sin resultados';
    const start = this.currentPage() * PAGE_SIZE + 1;
    const end = Math.min(start + PAGE_SIZE - 1, total);
    return `${start} – ${end} de ${total} documentos`;
  });

  resultsLabel = computed(() => {
    const n = this.filtered().length;
    return n === 1 ? '1 resultado' : `${n} resultados`;
  });

  subtitle = computed(() => {
    const total = this.rows().length;
    return `${this.monthLabel()} · ${total} ${total === 1 ? 'documento' : 'documentos'}`;
  });

  sortLabel = computed(() => (this.desc() ? 'Recientes' : 'Antiguos'));

  constructor(
    private docsService: DocsService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private viewsSvc: ViewsService,
    private snackBar: MatSnackBar,
    private storageSvc: StorageService,
    private appSvc: AppService,
    private utilsSvc: UtilsService
  ) {
    this.searchFormControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.term.set(value?.trim() ?? '');
        this.page.set(0);
      });
  }

  ngOnInit(): void {
    this.loadDocs();
  }

  loadDocs(): void {
    this.isLoading.set(true);
    this.docsService.getDocs().subscribe({
      next: (allDocs) => {
        const filtered = allDocs.filter((doc) => {
          const d = new Date(doc.uploadDate);
          return d.getMonth() + 1 === this.currentDate().month && d.getFullYear() === this.currentDate().year;
        });
        this.docs.set(filtered);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando docs', err);
        this.isLoading.set(false);
      }
    });
  }

  // ── Filas derivadas ─────────────────────────────────────────────────────────

  private toRow(doc: Doc): DocRow {
    const employee = doc.employeeId ? this.employeeService.getLocalEmployeeById(doc.employeeId) : undefined;
    const name = fullNameOf(employee) || 'Empleado no encontrado';
    const uploadDate = new Date(doc.uploadDate);
    return {
      id: doc.id ?? '',
      employeeName: name,
      employeeNameTitle: this.toTitleCase(name),
      employeeInitials: this.initials(name),
      employeeLegajo: employee?.employeeId != null ? `N° ${employee.employeeId}` : 'N° —',
      employeeSector: employee?.sector,
      type: doc.type,
      description: doc.description || '—',
      dateLabel: this.formatDate(doc.uploadDate),
      uploadDateMs: uploadDate.getTime(),
      userLabel: doc.audit?.createdBy || '—',
      raw: doc,
    };
  }

  private initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  private toTitleCase(name: string): string {
    return name
      .toLowerCase()
      .replace(/(^|\s)([a-záéíóúñ])/g, (_m, sep: string, char: string) => sep + char.toUpperCase());
  }

  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-AR');
  }

  // ── Filtros y paginado ───────────────────────────────────────────────────────

  setType(value: string) {
    this.typeFilter.set(value as TypeFilter);
    this.page.set(0);
  }

  toggleSort() {
    this.desc.update((value) => !value);
    this.page.set(0);
  }

  goToPage(page: number) {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  /** Exporta los documentos filtrados (todos, no solo la pagina) como CSV. */
  exportCsv() {
    const rows = this.filtered();
    if (rows.length === 0) return;

    const header = ['Tipo', 'Empleado', 'Descripción', 'Fecha', 'Usuario'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const typeLabel = (type: EDocType) => DOC_TYPES.find((item) => item.value === type)?.label ?? type;

    const csv = [
      header.join(';'),
      ...rows.map((row) =>
        [typeLabel(row.type), row.employeeName, row.description, row.dateLabel, row.userLabel]
          .map(escape).join(';')
      ),
    ].join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `documentos-${this.currentDate().year}-${String(this.currentDate().month).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  openDatePickerDialog(): void {
    const dialogRef = this.dialog.open(DatepickerDialog, {
      disableClose: true,
      data: this.currentDate()
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.appSvc.setDateOfData(result);
        this.page.set(0);
        this.loadDocs();
      }
    });
  }

  editDoc(docId: string | undefined): void {
    if (!docId) return;
    const dialogRef = this.dialog.open(AddDocDialog, {
      data: { editDocId: docId },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadDocs();
    });
  }

  openFile(doc: Doc): void {
    this.dialog.open(FileViewerDialog, {
      panelClass: 'full-screen-dialog',
      data: { driveFileId: doc.driveFileId, title: doc.description || this.utilsSvc.getDocFullName(doc.type) }
    });
  }

  creatorsFor(doc: Doc): DocRecordCreator[] {
    return this.recordCreators.filter(c => c.isCompatible(doc));
  }

  openDialog(): void {
    const ref = this.dialog.open(AddDocDialog, { disableClose: true });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadDocs();
    });
  }

  deleteDoc(doc: Doc): void {
    if (!doc.id) return;
    const dialogRef = this.dialog.open(Prompt, {
      data: {
        title: 'Eliminar documento',
        desc: '¿Está seguro que desea eliminar el documento?'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      if (!doc.id) return;
      this.docsService.deleteDoc(doc.id).subscribe({
        next: () => {
          this.storageSvc.deleteFile(doc.driveFileId).subscribe({
            next: () => {
              this.loadDocs();
              this.snackBar.open('Documento eliminado correctamente', 'OK', { duration: 2000 });
            },
            error: (err) => {
              console.error('Error borrando archivo', err);
              this.snackBar.open('Error borrando archivo', 'OK', { duration: 2000 });
            }
          });
        },
        error: (err) => {
          console.error('Error borrando doc', err);
          const msg = err?.status === 409
            ? 'Este documento esta en uso (ausencia u otro registro), no se puede eliminar'
            : 'Error borrando documento';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      });
    });
  }

  logout() {
    this.authService.logout();
  }
}
