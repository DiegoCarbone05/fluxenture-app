import { Component, computed, ElementRef, HostListener, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';

import { DocsService } from '../../../core/services/api/docs/docs.service';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { Doc, baseNameOf, extensionOf } from '../../../shared/models/Doc';
import { fullNameOf } from '../../../shared/models/Employee';
import { Prompt } from '../../dialogs/prompt/prompt';
import { MONTHS } from '../../../shared/constants/general-constant';
import { TipoDocumentoService } from '../../../core/services/api/tipo-documento/tipo-documento.service';
import { AppService } from '../../../core/services/app.service';
import { UtilsService } from '../../../core/services/utils.service';
import { ViewsService } from '../../views.service';
import { FileViewerDialog } from '../../dialogs/file-viewer-dialog/file-viewer-dialog';
import { ManageDocTypes } from '../../dialogs/manage-doc-types/manage-doc-types';
import { DocBulkEditDialog } from '../../dialogs/doc-bulk-edit-dialog/doc-bulk-edit-dialog';
import { DragDropFileDirective } from '../../../shared/directives/drag-drop-file';
import { filesFromClipboard } from '../../../shared/utils/clipboard-files';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PillButton } from '../../../shared/components/pill-button/pill-button';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { TableToolbar } from '../../../shared/components/table-toolbar/table-toolbar';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { M3SearchBar } from '../../../shared/components/m3-search-bar/m3-search-bar';
import { FabButton } from '../../../shared/components/fab-button/fab-button';
import { DocTile, DocGridRow } from './doc-tile/doc-tile';
import { DocDetailPanel } from './doc-detail-panel/doc-detail-panel';

type TypeFilter = 'todos' | string;

/** Fila derivada para la grilla — ver Docs#toRow. */
interface DocRow extends DocGridRow {
  employeeName: string;
  uploadDateMs: number;
  dateLabel: string;
  raw: Doc;
}

interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule, MatSidenavModule,
    MatDatepickerModule,
    PageHeader, PillButton, SearchBox, TableToolbar, EmptyState, M3SearchBar,
    FabButton, DocTile, DocDetailPanel, DragDropFileDirective,
  ],
  templateUrl: './docs.html',
  styleUrl: './docs.scss',
  providers: [provideNativeDateAdapter()],
})
export class Docs implements OnInit {

  readonly dialog = inject(MatDialog);

  @ViewChild('grid') gridRef?: ElementRef<HTMLElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild(SearchBox) searchBoxCmp?: SearchBox;

  isMobile = computed(() => this.viewsSvc.getIsMobile());

  readonly months = MONTHS;
  // El filtro usa el catalogo completo (no solo activos): un tipo archivado puede seguir
  // teniendo documentos viejos que hace falta poder encontrar.
  readonly docTypes = computed(() =>
    this.tipoDocumentoService.tipos().map(t => ({ value: t.id!, label: t.nombre }))
  );

  currentDate = computed(() => this.appSvc.dateOfData());
  monthLabel = computed(() => `${this.months[this.currentDate().month - 1]} ${this.currentDate().year}`);

  /** Valor del datepicker mes/año del header — sincronizado con currentDate() al abrir el picker. */
  monthYearControl = new FormControl<Date>(new Date());

  docs = signal<Doc[]>([]);
  isLoading = signal(true);
  uploading = signal(false);
  deleting = signal(false);

  searchFormControl = new FormControl<string>('');

  // ── Estado de filtros ───────────────────────────────────────────────────────
  term = signal<string>('');
  typeFilter = signal<TypeFilter>('todos');
  desc = signal<boolean>(true);

  // ── Seleccion (click / ctrl / shift / marquee) ──────────────────────────────
  selectedIds = signal<ReadonlySet<string>>(new Set());
  private lastAnchorId = signal<string | undefined>(undefined);

  isMarqueeing = signal(false);
  marqueeRect = signal<MarqueeRect | undefined>(undefined);
  private marqueeBase = new Set<string>();
  private marqueeAdditive = false;
  private marqueeMoved = false;
  private marqueeStartX = 0;
  private marqueeStartY = 0;

  private rows = computed<DocRow[]>(() => this.docs().map((doc) => this.toRow(doc)));

  filtered = computed<DocRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    const type = this.typeFilter();

    const result = this.rows().filter((row) => {
      if (type !== 'todos' && row.typeId !== type) return false;
      if (term) {
        const typeLabel = this.tipoDocumentoService.nombreDe(row.typeId);
        const haystack = [row.employeeName, row.description, typeLabel].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const desc = this.desc();
    return result.sort((a, b) => (desc ? b.uploadDateMs - a.uploadDateMs : a.uploadDateMs - b.uploadDateMs));
  });

  selectionCount = computed(() => this.selectedIds().size);
  selectedDocsList = computed<Doc[]>(() => {
    const ids = this.selectedIds();
    return this.docs().filter((d) => d.id && ids.has(d.id));
  });
  selectedDoc = computed<Doc | undefined>(() =>
    this.selectionCount() === 1 ? this.selectedDocsList()[0] : undefined
  );
  detailOpen = computed(() => this.selectionCount() === 1);

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
    private viewsSvc: ViewsService,
    private snackBar: MatSnackBar,
    private storageSvc: StorageService,
    private appSvc: AppService,
    private utilsSvc: UtilsService,
    private tipoDocumentoService: TipoDocumentoService
  ) {
    this.searchFormControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.term.set(value?.trim() ?? '');
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
    const uploadDate = new Date(doc.uploadDate);
    return {
      id: doc.id ?? '',
      employeeName: fullNameOf(employee) || '',
      typeId: doc.type,
      extension: doc.extension,
      description: doc.description || 'Sin nombre',
      blocked: !doc.employeeId && !doc.empresaId,
      dateLabel: this.formatDate(doc.uploadDate),
      uploadDateMs: uploadDate.getTime(),
      raw: doc,
    };
  }

  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-AR');
  }

  // ── Filtros y orden ──────────────────────────────────────────────────────────

  setType(value: string) {
    this.typeFilter.set(value as TypeFilter);
  }

  toggleSort() {
    this.desc.update((value) => !value);
  }

  /** Exporta los documentos filtrados (todos, no solo los seleccionados) como CSV. */
  exportCsv() {
    const rows = this.filtered();
    if (rows.length === 0) return;

    const header = ['Tipo', 'Empleado', 'Descripción', 'Fecha'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const typeLabel = (type: string | undefined) => this.tipoDocumentoService.nombreDe(type);

    const csv = [
      header.join(';'),
      ...rows.map((row) =>
        [typeLabel(row.typeId), row.employeeName || '—', row.description, row.dateLabel]
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

  // ── Seleccion: click / ctrl / shift ─────────────────────────────────────────

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
    this.lastAnchorId.set(undefined);
  }

  onTileClick(event: { id: string; ctrlKey: boolean; shiftKey: boolean }): void {
    const order = this.filtered().map((r) => r.id);

    if (event.shiftKey) {
      const anchor = this.lastAnchorId();
      const anchorIdx = anchor ? order.indexOf(anchor) : -1;
      const clickIdx = order.indexOf(event.id);
      if (anchorIdx === -1 || clickIdx === -1) {
        this.selectedIds.set(new Set([event.id]));
        this.lastAnchorId.set(event.id);
        return;
      }
      const [from, to] = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx];
      const range = order.slice(from, to + 1);
      const base = event.ctrlKey ? new Set(this.selectedIds()) : new Set<string>();
      range.forEach((id) => base.add(id));
      this.selectedIds.set(base);
      return; // el ancla no se mueve con shift-click
    }

    if (event.ctrlKey) {
      const next = new Set(this.selectedIds());
      if (next.has(event.id)) next.delete(event.id); else next.add(event.id);
      this.selectedIds.set(next);
      this.lastAnchorId.set(event.id);
      return;
    }

    this.selectedIds.set(new Set([event.id]));
    this.lastAnchorId.set(event.id);
  }

  // ── Seleccion por rectangulo (marquee) ──────────────────────────────────────

  onGridMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.doc-tile')) return; // el click sobre un tile lo maneja onTileClick

    this.marqueeAdditive = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
    this.marqueeBase = this.marqueeAdditive ? new Set(this.selectedIds()) : new Set<string>();
    this.marqueeStartX = event.clientX;
    this.marqueeStartY = event.clientY;
    this.marqueeMoved = false;
    this.isMarqueeing.set(true);
    this.marqueeRect.set({ left: event.clientX, top: event.clientY, width: 0, height: 0 });
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isMarqueeing()) return;
    this.updateMarquee(event.clientX, event.clientY);
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (!this.isMarqueeing()) return;
    this.finishMarquee();
  }

  /** Supr/Delete con algo seleccionado = eliminar, igual que en un explorador de archivos.
   *  No dispara si el foco esta en un campo editable (buscador, campos del panel, etc). */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Delete') return;
    if (this.selectionCount() === 0 || this.deleting()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    this.deleteSelected();
  }

  private updateMarquee(clientX: number, clientY: number): void {
    const dx = clientX - this.marqueeStartX;
    const dy = clientY - this.marqueeStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.marqueeMoved = true;

    const left = Math.min(clientX, this.marqueeStartX);
    const top = Math.min(clientY, this.marqueeStartY);
    const width = Math.abs(dx);
    const height = Math.abs(dy);
    this.marqueeRect.set({ left, top, width, height });

    const right = left + width;
    const bottom = top + height;
    const tiles = this.gridRef?.nativeElement.querySelectorAll('.doc-tile');
    const intersecting = new Set<string>();
    tiles?.forEach((el) => {
      const id = el.getAttribute('data-doc-id');
      if (!id) return;
      const r = el.getBoundingClientRect();
      if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) {
        intersecting.add(id);
      }
    });
    this.selectedIds.set(new Set([...this.marqueeBase, ...intersecting]));
  }

  private finishMarquee(): void {
    this.isMarqueeing.set(false);
    this.marqueeRect.set(undefined);
    if (!this.marqueeMoved && !this.marqueeAdditive) {
      this.clearSelection();
    }
  }

  onDrawerOpenedChange(opened: boolean): void {
    // OJO: esto tambien se dispara cuando [opened]="detailOpen()" pasa a false porque la
    // seleccion cambio de 1 a 2+ (multi-seleccion en curso) — en ese caso selectionCount()
    // ya NO es 1 y no hay que tocar nada, o se borraria la seleccion que se acaba de armar.
    // Solo limpiar cuando el cierre vino de afuera de nuestro propio estado (ej: tecla Escape
    // sobre el drawer con 1 solo doc todavia seleccionado).
    if (!opened && this.selectionCount() === 1) {
      this.clearSelection();
    }
  }

  // ── Subida multiple ──────────────────────────────────────────────────────────

  triggerUpload(): void {
    if (this.uploading()) return;
    this.fileInputRef?.nativeElement.click();
  }

  onFilePickerChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    this.handleFilesSelected(files);
  }

  onFilesDropped(files: File[]): void {
    this.handleFilesSelected(files);
  }

  /** Ctrl+V con archivos en el portapapeles (capturas, imagenes o archivos copiados del
   *  explorador) = subirlos, igual que soltarlos sobre la grilla. Si lo pegado es solo texto
   *  (ej: en el buscador o en el panel) se deja pasar normal. */
  @HostListener('document:paste', ['$event'])
  onDocumentPaste(event: ClipboardEvent): void {
    if (this.dialog.openDialogs.length > 0) return; // con un dialogo abierto, el paste es de el
    const files = filesFromClipboard(event);
    if (files.length === 0) return;
    event.preventDefault();
    this.handleFilesSelected(files);
  }

  private handleFilesSelected(files: File[]): void {
    if (files.length === 0 || this.uploading()) return;
    this.uploading.set(true);
    // Sin duration: queda visible hasta que el snackbar final de resultado lo reemplace.
    this.snackBar.open(
      files.length === 1 ? 'Subiendo archivo…' : `Subiendo ${files.length} archivos…`,
      undefined,
      { duration: undefined }
    );

    const uploads = files.map((file) =>
      this.storageSvc.uploadDoc(file).pipe(
        switchMap((res: any) => {
          const payload: Doc = {
            driveFileId: res.response,
            extension: extensionOf(file.name),
            uploadDate: new Date(),
            description: baseNameOf(file.name),
          } as Doc;
          return this.docsService.saveDoc(payload);
        }),
        map(() => ({ ok: true, name: file.name })),
        catchError((err) => {
          console.error('Error subiendo archivo', file.name, err);
          return of({ ok: false, name: file.name });
        })
      )
    );

    forkJoin(uploads).subscribe((results) => {
      this.uploading.set(false);
      const okCount = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok).map((r) => r.name);
      const msg = failed.length === 0
        ? `${okCount} ${okCount === 1 ? 'archivo subido' : 'archivos subidos'}`
        : `${okCount} de ${results.length} subidos · fallaron: ${failed.join(', ')}`;
      this.snackBar.open(msg, 'OK', { duration: 4000 });
      this.loadDocs();
    });
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  /** Abre el datepicker mes/año del header, sincronizando su valor con el período actual. */
  openMonthYearPicker(picker: MatDatepicker<Date>): void {
    const current = this.currentDate();
    this.monthYearControl.setValue(new Date(current.year, current.month - 1, 1));
    picker.open();
  }

  onYearSelected(normalizedYear: Date): void {
    const value = this.monthYearControl.value ?? new Date();
    const next = new Date(value);
    next.setFullYear(normalizedYear.getFullYear());
    this.monthYearControl.setValue(next);
  }

  /** Se dispara al elegir el mes: aplica el período y cierra sin llegar a la vista de días. */
  onMonthSelected(normalizedMonth: Date, picker: MatDatepicker<Date>): void {
    const value = this.monthYearControl.value ?? new Date();
    const next = new Date(value);
    next.setMonth(normalizedMonth.getMonth());
    this.monthYearControl.setValue(next);
    picker.close();

    this.appSvc.setDateOfData({ month: next.getMonth() + 1, year: next.getFullYear() });
    this.clearSelection();
    this.loadDocs();
  }

  openFile(doc: Doc): void {
    this.dialog.open(FileViewerDialog, {
      panelClass: 'full-screen-dialog',
      data: { driveFileId: doc.driveFileId, title: doc.description || this.utilsSvc.getDocFullName(doc.type) }
    });
  }

  manageDocTypes(): void {
    this.dialog.open(ManageDocTypes);
  }

  /** Botón lupa del header: le da foco al buscador de la toolbar (no es un campo propio). */
  focusSearch(): void {
    this.searchBoxCmp?.focus();
  }

  editBulk(): void {
    const docs = this.selectedDocsList();
    if (docs.length < 2) return;
    const ref = this.dialog.open(DocBulkEditDialog, { data: { docs }, disableClose: true });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.clearSelection();
        this.loadDocs();
      }
    });
  }

  exportSelected(): void {
    const rows = this.filtered().filter((r) => this.selectedIds().has(r.id));
    if (rows.length === 0) return;

    const files = rows.map((r) => ({ docId: r.id, name: r.description }));
    const zipName = `documentos-${this.currentDate().year}-${String(this.currentDate().month).padStart(2, '0')}.zip`;

    this.docsService.exportZip(zipName, files).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = zipName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error exportando seleccionados', err);
        this.snackBar.open('No se pudieron exportar los documentos', 'OK', { duration: 3000 });
      }
    });
  }

  onDetailSaved(): void {
    this.snackBar.open('Documento actualizado', 'OK', { duration: 2000 });
    this.loadDocs();
  }

  onDetailDeleteRequested(doc: Doc): void {
    this.clearSelection();
    this.deleteDoc(doc);
  }

  deleteDoc(doc: Doc): void {
    if (!doc.id || this.deleting()) return;
    const dialogRef = this.dialog.open(Prompt, {
      data: {
        title: 'Eliminar documento',
        desc: '¿Está seguro que desea eliminar el documento?'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      if (!doc.id) return;
      this.deleting.set(true);
      this.snackBar.open('Eliminando documento…', undefined, { duration: undefined });
      this.docsService.deleteDoc(doc.id).subscribe({
        next: () => {
          this.storageSvc.deleteFile(doc.driveFileId).subscribe({
            next: () => {
              this.deleting.set(false);
              this.loadDocs();
              this.snackBar.open('Documento eliminado correctamente', 'OK', { duration: 2000 });
            },
            error: (err) => {
              console.error('Error borrando archivo', err);
              this.deleting.set(false);
              this.snackBar.open('Error borrando archivo', 'OK', { duration: 2000 });
            }
          });
        },
        error: (err) => {
          console.error('Error borrando doc', err);
          this.deleting.set(false);
          const msg = err?.status === 409
            ? 'Este documento esta en uso (ausencia u otro registro), no se puede eliminar'
            : 'Error borrando documento';
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        }
      });
    });
  }

  deleteSelected(): void {
    if (this.deleting()) return;
    const docsToDelete = this.selectedDocsList();
    if (docsToDelete.length === 0) return;
    if (docsToDelete.length === 1) {
      this.deleteDoc(docsToDelete[0]);
      return;
    }

    const dialogRef = this.dialog.open(Prompt, {
      data: {
        title: 'Eliminar documentos',
        desc: `¿Está seguro que desea eliminar ${docsToDelete.length} documentos?`
      }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.deleting.set(true);
      this.snackBar.open(`Eliminando ${docsToDelete.length} documentos…`, undefined, { duration: undefined });
      const requests = docsToDelete.filter((d) => d.id).map((doc) =>
        this.docsService.deleteDoc(doc.id!).pipe(
          switchMap(() => this.storageSvc.deleteFile(doc.driveFileId)),
          map(() => true),
          catchError((err) => {
            console.error('Error borrando doc', err);
            return of(false);
          })
        )
      );
      forkJoin(requests).subscribe((results) => {
        this.deleting.set(false);
        const okCount = results.filter(Boolean).length;
        this.snackBar.open(`${okCount} de ${results.length} documentos eliminados`, 'OK', { duration: 3000 });
        this.clearSelection();
        this.loadDocs();
      });
    });
  }
}
