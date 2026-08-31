import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { CdStatusChip } from '../../../shared/components/cd-status-chip/cd-status-chip';
import { TntStatusPipePipe } from '../../../shared/pipes/tnt-status.pipe-pipe';
import { MatDialog } from '@angular/material/dialog';
import { AddPdf } from '../../dialogs/add-pdf/add-pdf';
import { Cd, trackingCodeOf } from '../../../shared/models/Cd.model';
import { ESector, fullNameOf } from '../../../shared/models/Employee';
import { Router, RouterLink } from '@angular/router';
import { CdService } from '../../../core/services/api/cd-api/cd.service';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { ViewsService } from '../../views.service';
import { Prompt } from '../../dialogs/prompt/prompt';
import { StorageService } from '../../../core/services/api/storage/storage.service';

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
import { TabStrip } from '../../../shared/components/tab-strip/tab-strip';
import { M3TabStrip } from '../../../shared/components/m3-tab-strip/m3-tab-strip';
import { TabOption } from '../../../shared/models/TabOption';

const SEEN_DELIVERED_KEY = 'flux_seen_delivered_cds';
type TabKey = 'active' | 'completed';
const PAGE_SIZE = 12;

/** Fila ya derivada para la vista: evita repetir lookups dentro del template. */
interface CdRow {
  id: string;
  employeeName: string;
  employeeNameTitle: string;
  employeeInitials: string;
  employeeLegajo: string;
  employeeSector?: ESector;
  /** Codigo completo con prefijo, ej "CD123456789": es lo que se busca en Correo Argentino. */
  trackingCode: string;
  emissionMs: number;
  obs: string;
  isNew: boolean;
  raw: Cd;
}

@Component({
  selector: 'app-tnt',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink,
    CdStatusChip, TntStatusPipePipe,
    PageHeader, PillButton, IconButton, SearchBox, TableToolbar, EmployeeCell,
    RowActions, TablePager, EmptyState, M3SearchBar, M3ListItem, FabButton,
    TabStrip, M3TabStrip,
  ],
  templateUrl: './tnt.html',
  styleUrl: './tnt.scss',
})
export class Tnt {
  readonly dialog = inject(MatDialog);
  readonly pageSize = PAGE_SIZE;

  isMobile = computed(() => this.viewsSvc.getIsMobile());
  user = computed(() => this.authService.getUserSignal()());
  userInitials = computed(() => (this.user()?.username ?? '').slice(0, 2).toUpperCase());

  cdsSignal = computed(() => this.cdService.getCdsSignal());
  sortedCds = computed(() =>
    [...this.cdsSignal()].sort(
      (a, b) =>
        new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime(),
    ),
  );

  activeCds = computed(() =>
    this.sortedCds().filter((cd) => !cd.trackingCompleted),
  );

  /** IDs de CDs entregadas que el usuario ya abrió al menos una vez, persistido en este navegador. */
  private seenDeliveredIds = signal<Set<string>>(this.loadSeenIds());

  // Las que todavía no se abrieron ("nuevas") quedan primero en la lista.
  completedCds = computed(() => {
    const seen = this.seenDeliveredIds();
    return this.sortedCds()
      .filter((cd) => cd.trackingCompleted)
      .sort((a, b) => {
        const aNew = seen.has(a.id) ? 0 : 1;
        const bNew = seen.has(b.id) ? 0 : 1;
        if (aNew !== bNew) return bNew - aNew;
        return (
          new Date(b.emissionDate).getTime() -
          new Date(a.emissionDate).getTime()
        );
      });
  });

  newDeliveredCount = computed(
    () => this.completedCds().filter((cd) => this.isNewlyDelivered(cd)).length,
  );

  tabs = computed<TabOption[]>(() => [
    { key: 'active', label: 'Pendientes', badge: this.activeCds().length || undefined },
    { key: 'completed', label: 'Entregadas' },
  ]);

  // ── Estado de filtros ───────────────────────────────────────────────────────
  tab = signal<TabKey>('active');
  term = signal<string>('');
  desc = signal<boolean>(true);
  activePageIndex = signal(0);
  completedPageIndex = signal(0);

  searchFormControl = new FormControl<string>('');

  subtitle = computed(
    () => `${this.activeCds().length} en seguimiento · ${this.completedCds().length} entregados`
  );
  sortLabel = computed(() => (this.desc() ? 'Recientes' : 'Antiguos'));

  private filteredActive = computed<CdRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    const desc = this.desc();
    let rows = this.activeCds().map((cd) => this.toRow(cd));
    if (term) rows = rows.filter((row) => this.matchesTerm(row, term));
    return rows.sort((a, b) => (desc ? b.emissionMs - a.emissionMs : a.emissionMs - b.emissionMs));
  });

  private filteredCompleted = computed<CdRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    const desc = this.desc();
    // completedCds() ya viene ordenada "nuevas primero + fecha desc": se respeta como default.
    let rows = this.completedCds().map((cd) => this.toRow(cd));
    if (term) rows = rows.filter((row) => this.matchesTerm(row, term));
    if (!desc) rows = [...rows].sort((a, b) => a.emissionMs - b.emissionMs);
    return rows;
  });

  /** Filas de la pestaña activa, sin paginar: la usa la lista M3 de movil. */
  activeRows = computed<CdRow[]>(() =>
    this.tab() === 'active' ? this.filteredActive() : this.filteredCompleted()
  );

  totalPages = computed(() => Math.max(1, Math.ceil(this.activeRows().length / PAGE_SIZE)));

  currentPage = computed(() => {
    const raw = this.tab() === 'active' ? this.activePageIndex() : this.completedPageIndex();
    return Math.min(raw, this.totalPages() - 1);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const start = Math.max(0, Math.min(this.currentPage() - 1, total - 3));
    return Array.from({ length: Math.min(3, total) }, (_, i) => start + i);
  });

  pagedRows = computed(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.activeRows().slice(start, start + PAGE_SIZE);
  });

  rangeLabel = computed(() => {
    const total = this.activeRows().length;
    if (total === 0) return 'Sin resultados';
    const start = this.currentPage() * PAGE_SIZE + 1;
    const end = Math.min(start + PAGE_SIZE - 1, total);
    return `${start} – ${end} de ${total} envíos`;
  });

  resultsLabel = computed(() => {
    const n = this.activeRows().length;
    return n === 1 ? '1 resultado' : `${n} resultados`;
  });

  constructor(
    private router: Router,
    private cdService: CdService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private viewsSvc: ViewsService,
    private storageService: StorageService,
  ) {
    this.searchFormControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => this.term.set(value?.trim() ?? ''));
  }

  // ── Filas derivadas ─────────────────────────────────────────────────────────

  private toRow(cd: Cd): CdRow {
    const employee = this.employeeService.getLocalEmployeeById(cd.employeeId);
    const name = fullNameOf(employee) || 'Empleado no encontrado';
    return {
      id: cd.id,
      employeeName: name,
      employeeNameTitle: this.toTitleCase(name),
      employeeInitials: this.initials(name),
      employeeLegajo: employee?.employeeId != null ? `N° ${employee.employeeId}` : 'N° —',
      employeeSector: employee?.sector,
      trackingCode: trackingCodeOf(cd),
      emissionMs: new Date(cd.emissionDate).getTime(),
      obs: cd.obs || '—',
      isNew: this.isNewlyDelivered(cd),
      raw: cd,
    };
  }

  private matchesTerm(row: CdRow, term: string): boolean {
    // Se busca tambien contra el numero pelado: nadie tipea el prefijo para filtrar.
    return `${row.employeeName} ${row.trackingCode} ${row.raw.trackingNumber} ${row.obs}`
      .toLowerCase()
      .includes(term);
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

  // ── Filtros y paginado ───────────────────────────────────────────────────────

  setTab(tab: string) {
    this.tab.set(tab as TabKey);
  }

  toggleSort() {
    this.desc.update((value) => !value);
  }

  goToPage(page: number) {
    const clamped = Math.max(0, Math.min(page, this.totalPages() - 1));
    if (this.tab() === 'active') this.activePageIndex.set(clamped);
    else this.completedPageIndex.set(clamped);
  }

  /** Exporta los envíos filtrados de la pestaña activa (todos, no solo la pagina). */
  exportCsv() {
    const rows = this.activeRows();
    if (rows.length === 0) return;

    const header = ['Nro. Seguimiento', 'Empleado', 'Fecha', 'Observación', 'Estado'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const csv = [
      header.join(';'),
      ...rows.map((row) =>
        [
          row.trackingCode,
          row.employeeName,
          new Date(row.emissionMs).toLocaleDateString('es-AR'),
          row.obs,
          row.raw.trackingCompleted ? 'Entregado' : 'En seguimiento',
        ].map(escape).join(';')
      ),
    ].join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.tab()}-envios-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  isNewlyDelivered(cd: Cd): boolean {
    return !!cd.trackingCompleted && !this.seenDeliveredIds().has(cd.id);
  }

  openCdsViewer(element: Cd): void {
    if (element.trackingCompleted) this.markAsSeen(element.id);
    this.router.navigate([
      '/main',
      'app-pages',
      'tnt',
      'cds-viewer',
      trackingCodeOf(element),
    ]);
  }

  markAllAsSeen(): void {
    const next = new Set(this.seenDeliveredIds());
    for (const cd of this.completedCds()) next.add(cd.id);
    this.persistSeenIds(next);
  }

  private loadSeenIds(): Set<string> {
    try {
      const raw = localStorage.getItem(SEEN_DELIVERED_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private markAsSeen(id: string) {
    const current = this.seenDeliveredIds();
    if (current.has(id)) return;

    const next = new Set(current);
    next.add(id);
    this.persistSeenIds(next);
  }

  private persistSeenIds(next: Set<string>): void {
    this.seenDeliveredIds.set(next);
    localStorage.setItem(SEEN_DELIVERED_KEY, JSON.stringify([...next]));
  }

  deleteCd(cd: Cd, e?: Event): void {
    e?.stopPropagation();
    this.dialog
      .open(Prompt, {
        data: {
          title: 'Eliminar CD',
          desc: '¿Estás seguro de querer eliminar este CD?',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.cdService.deleteCd(cd.id).subscribe({
            next: () => {
              this.cdService.refreshCds().subscribe();
              this.storageService.deleteFile(cd.fileId).subscribe();
            },
            error: (error) => console.error(error),
          });
        }
      });
  }

  loadPDF(): void {
    this.dialog.open(AddPdf, {
      disableClose: true,
      panelClass: 'custom-flex-dialog',
    });
  }

  editCd(cd: Cd, e?: Event): void {
    e?.stopPropagation();
    this.dialog.open(AddPdf, {
      data: cd,
      panelClass: 'custom-flex-dialog',
    });
  }

  logout() {
    this.authService.logout();
  }
}
