import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { AbstentTypePipe } from '../../../shared/pipes/abstent-type-pipe';
import { DocTypePipe } from '../../../shared/pipes/doc-type-pipe';
import { AddAbsentDialog } from '../../dialogs/add-absent-dialog/add-absent-dialog';
import { AddDocDialog } from '../../dialogs/add-doc-dialog/add-doc-dialog';
import { FileViewerDialog } from '../../dialogs/file-viewer-dialog/file-viewer-dialog';
import { DatepickerDialog } from '../../dialogs/datepicker-dialog/datepicker-dialog';
import { AbsentResponseDTO } from '../../../shared/models/AbsentResponseDTO';
import { AbsentService } from '../../../core/services/api/absents/absent.service';
import { AbsentDocRecordCreatorService } from '../../../core/services/api/absents/absent-doc-record-creator.service';
import { NovedadService } from '../../../core/services/api/novedades/novedad.service';
import { NovedadResponseDTO } from '../../../shared/models/Novedad';
import { Doc } from '../../../shared/models/Doc';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { UtilsService } from '../../../core/services/utils.service';
import { AppService } from '../../../core/services/app.service';
import { ViewsService } from '../../views.service';
import { AbsentType } from '../../../shared/models/Absent.model';
import { ESector, fullNameOf } from '../../../shared/models/Employee';
import { MONTHS } from '../../../shared/constants/general-constant';
import { ABSENT_TYPES } from '../../../shared/constants/typesValues.constant';
import { StatCardData } from '../../../shared/models/StatCardData';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PillButton } from '../../../shared/components/pill-button/pill-button';
import { IconButton } from '../../../shared/components/icon-button/icon-button';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { TableToolbar } from '../../../shared/components/table-toolbar/table-toolbar';
import { EmployeeCell } from '../../../shared/components/employee-cell/employee-cell';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { StatsGrid } from '../../../shared/components/stats-grid/stats-grid';
import { TablePager } from '../../../shared/components/table-pager/table-pager';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { M3SearchBar } from '../../../shared/components/m3-search-bar/m3-search-bar';
import { M3StatsRow } from '../../../shared/components/m3-stats-row/m3-stats-row';
import { M3ListItem } from '../../../shared/components/m3-list-item/m3-list-item';
import { FilterChips } from '../../../shared/components/filter-chips/filter-chips';
import { FabButton } from '../../../shared/components/fab-button/fab-button';
import { RowActions } from '../../../shared/components/row-actions/row-actions';
import { TabStrip } from '../../../shared/components/tab-strip/tab-strip';
import { M3TabStrip } from '../../../shared/components/m3-tab-strip/m3-tab-strip';
import { TabOption } from '../../../shared/models/TabOption';

type TabKey = 'absents' | 'novedades' | 'calendar' | 'stats';
type StatusFilter = 'todos' | 'justificadas' | 'injustificadas';

/** Datos del empleado ya resueltos, para no repetir lookups en el template. */
interface EmployeeCellData {
  name: string;
  nameTitle: string;
  initials: string;
  legajo: string;
  sector?: ESector;
}

interface AbsentRow extends EmployeeCellData {
  id: string;
  employeeId: string;
  type: AbsentType;
  justified: boolean;
  docId: string;
  days: number;
  period: string;
  raw: AbsentResponseDTO;
}

interface NovedadRow extends EmployeeCellData {
  id: string;
  doc: Doc;
  description: string;
  uploadDate: string;
  raw: NovedadResponseDTO;
}

interface EmployeeStat {
  employeeId: string;
  justified: number;
  sinAviso: number;
  suspension: number;
  license: number;
  ft: number;
  dt: number;
  art: number;
  vacations: number;
  totalInjust: number;
  total: number;
}

interface StatRow extends EmployeeCellData {
  employeeId: string;
  stat: EmployeeStat;
  tags: { label: string; value: number; class: string }[];
}

const PAGE_SIZE = 12;

@Component({
  selector: 'app-absents',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
    AbstentTypePipe, DocTypePipe,
    PageHeader, PillButton, IconButton, SearchBox, TableToolbar, EmployeeCell,
    StatusChip, StatsGrid, TablePager, EmptyState, M3SearchBar, M3StatsRow,
    M3ListItem, FilterChips, FabButton, RowActions, TabStrip, M3TabStrip,
  ],
  templateUrl: './absents.html',
  styleUrl: './absents.scss'
})
export class Absents implements OnInit {

  private readonly dialog = inject(MatDialog);

  isMobile = computed(() => this.viewsSvc.getIsMobile());

  readonly months = MONTHS;
  readonly absentTypes = ABSENT_TYPES;
  readonly pageSize = PAGE_SIZE;

  private readonly tabDefs: { key: TabKey; label: string; mobileLabel: string }[] = [
    { key: 'absents', label: 'Ausencias', mobileLabel: 'Ausencias' },
    { key: 'novedades', label: 'Novedades', mobileLabel: 'Novedades' },
    { key: 'calendar', label: 'Calendario', mobileLabel: 'Calendario' },
    { key: 'stats', label: 'Estadísticas', mobileLabel: 'Stats' },
  ];

  /** Solo la pestaña Novedades lleva contador, y es dinamico. */
  tabs = computed<TabOption[]>(() =>
    this.tabDefs.map((t) => ({
      ...t,
      badge: t.key === 'novedades' ? this.novedades().length : undefined,
    }))
  );

  readonly statusChips: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todas' },
    { key: 'justificadas', label: 'Justificadas' },
    { key: 'injustificadas', label: 'Sin justificar' },
  ];

  // ── Estado ──────────────────────────────────────────────────────────────────
  tab = signal<TabKey>('absents');
  term = signal<string>('');
  /** Tipos elegidos; vacio = todos. Es acumulativo: se pueden marcar varios a la vez. */
  typeFilters = signal<AbsentType[]>([]);
  status = signal<StatusFilter>('todos');
  asc = signal<boolean>(true);
  page = signal<number>(0);
  isLoading = signal<boolean>(false);
  isExportingFiles = signal<boolean>(false);

  searchFormControl = new FormControl<string>('');

  absentOfMonth = signal<AbsentResponseDTO[]>([]);
  novedades = signal<NovedadResponseDTO[]>([]);
  daysOfMonth = signal<any[]>([]);

  currentDate = computed(() => this.appSvc.dateOfData());
  monthLabel = computed(
    () => `${MONTHS[this.currentDate().month - 1]} ${this.currentDate().year}`
  );

  private employees = computed(() => this.employeeService.getEmployeesSignal()());

  // ── Filas derivadas ─────────────────────────────────────────────────────────

  private absentRows = computed<AbsentRow[]>(() =>
    this.absentOfMonth().map((absent) => ({
      ...this.employeeCell(absent.employeeId),
      id: absent.id,
      employeeId: absent.employeeId,
      type: absent.type as AbsentType,
      justified: absent.justified,
      docId: absent.docId,
      days: absent.impactDaysInMonth,
      period: `${this.shortDate(absent.originalStartDate)} → ${this.shortDate(absent.originalEndDate)}`,
      raw: absent,
    }))
  );

  private novedadRows = computed<NovedadRow[]>(() =>
    this.novedades().map((novedad) => ({
      ...this.employeeCell(novedad.doc.employeeId ?? ''),
      id: novedad.id,
      doc: novedad.doc,
      description: novedad.doc.description || '—',
      uploadDate: this.formatDate(novedad.doc.uploadDate),
      raw: novedad,
    }))
  );

  filteredAbsents = computed<AbsentRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    const types = this.typeFilters();
    const status = this.status();

    const rows = this.absentRows().filter((row) => {
      if (types.length > 0 && !types.includes(row.type)) return false;
      if (status === 'justificadas' && !row.justified) return false;
      if (status === 'injustificadas' && row.justified) return false;
      if (term && !`${row.name} ${row.legajo}`.toLowerCase().includes(term)) return false;
      return true;
    });

    const asc = this.asc();
    return rows.sort((a, b) =>
      asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  });

  filteredNovedades = computed<NovedadRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    const rows = this.novedadRows().filter((row) =>
      term ? `${row.name} ${row.legajo} ${row.description}`.toLowerCase().includes(term) : true
    );

    const asc = this.asc();
    return rows.sort((a, b) =>
      asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  });

  private readonly STAT_LABELS: { key: keyof EmployeeStat; label: string; class: string }[] = [
    { key: 'justified', label: 'Justificada', class: 'justified' },
    { key: 'sinAviso', label: 'Sin Aviso', class: 'unjustified' },
    { key: 'suspension', label: 'Suspensión', class: 'suspension' },
    { key: 'totalInjust', label: 'T.Inj.', class: 'total-injust' },
    { key: 'license', label: 'Licencia', class: 'license' },
    { key: 'ft', label: 'FT', class: 'ft' },
    { key: 'dt', label: 'DT', class: 'dt' },
    { key: 'art', label: 'ART', class: 'art' },
    { key: 'vacations', label: 'Vacaciones', class: 'vacations' },
  ];

  employeeStats = computed((): EmployeeStat[] => {
    const statsMap = new Map<string, EmployeeStat>();

    for (const abs of this.absentOfMonth()) {
      if (!statsMap.has(abs.employeeId)) {
        statsMap.set(abs.employeeId, {
          employeeId: abs.employeeId,
          justified: 0, sinAviso: 0, suspension: 0,
          license: 0, ft: 0, dt: 0, art: 0, vacations: 0,
          totalInjust: 0, total: 0
        });
      }
      const stat = statsMap.get(abs.employeeId)!;
      const days = abs.impactDaysInMonth;

      // FT/DT son dias EXTRA trabajados (feriado/domingo), no ausencias: la empresa
      // los paga doble. No deben sumar a total/totalInjust o van a figurar como
      // si el empleado no hubiera venido, cuando en realidad vino de mas.
      switch (abs.type) {
        case AbsentType.SUSPENSION: stat.suspension += days; break;
        case AbsentType.LICENSE: stat.license += days; break;
        case AbsentType.FT: stat.ft += days; continue;
        case AbsentType.DT: stat.dt += days; continue;
        case AbsentType.ART: stat.art += days; break;
        case AbsentType.VACATIONS: stat.vacations += days; break;
        case AbsentType.DESPIDO:
        case AbsentType.RENUNCIA: break;
        default:
          abs.justified ? (stat.justified += days) : (stat.sinAviso += days);
      }
      if (!abs.justified) stat.totalInjust += days;
      stat.total += days;
    }

    return [...statsMap.values()].sort((a, b) => b.total - a.total);
  });

  filteredStats = computed<StatRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    return this.employeeStats()
      .map((stat) => ({
        ...this.employeeCell(stat.employeeId),
        employeeId: stat.employeeId,
        stat,
        tags: this.getStatTags(stat),
      }))
      .filter((row) =>
        term ? `${row.name} ${row.legajo}`.toLowerCase().includes(term) : true
      );
  });

  // ── Paginado (compartido por las tres tablas) ───────────────────────────────

  /** Cantidad de filas de la pestaña activa; el calendario no pagina. */
  private activeCount = computed(() => {
    switch (this.tab()) {
      case 'absents': return this.filteredAbsents().length;
      case 'novedades': return this.filteredNovedades().length;
      case 'stats': return this.filteredStats().length;
      default: return 0;
    }
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.activeCount() / PAGE_SIZE)));
  currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const start = Math.max(0, Math.min(this.currentPage() - 1, total - 3));
    return Array.from({ length: Math.min(3, total) }, (_, i) => start + i);
  });

  pagedAbsents = computed(() => this.slice(this.filteredAbsents()));
  pagedNovedades = computed(() => this.slice(this.filteredNovedades()));
  pagedStats = computed(() => this.slice(this.filteredStats()));

  private slice<T>(rows: T[]): T[] {
    const start = this.currentPage() * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }

  rangeLabel = computed(() => {
    const total = this.activeCount();
    if (total === 0) return 'Sin resultados';
    const start = this.currentPage() * PAGE_SIZE + 1;
    const end = Math.min(start + PAGE_SIZE - 1, total);
    const noun = this.tab() === 'novedades' ? 'novedades' : this.tab() === 'stats' ? 'empleados' : 'ausencias';
    return `${start} – ${end} de ${total} ${noun}`;
  });

  resultsLabel = computed(() => {
    const n = this.activeCount();
    return n === 1 ? '1 resultado' : `${n} resultados`;
  });

  sortLabel = computed(() => (this.asc() ? 'A → Z' : 'Z → A'));

  typeFilterLabel = computed(() => {
    const selected = this.typeFilters();
    if (selected.length === 0) return 'Tipo: todos';
    if (selected.length === 1) return `Tipo: ${this.getAbsentFullName(selected[0]) ?? selected[0]}`;
    return `Tipo: ${selected.length} seleccionados`;
  });

  subtitle = computed(() => {
    const absents = this.absentOfMonth().length;
    const pending = this.novedades().length;
    return `${this.monthLabel()} · ${absents} ${absents === 1 ? 'ausencia' : 'ausencias'} · ${pending} ${pending === 1 ? 'novedad pendiente' : 'novedades pendientes'}`;
  });

  // ── Métricas ────────────────────────────────────────────────────────────────

  stats = computed<StatCardData[]>(() => {
    const rows = this.absentRows();
    // FT/DT (feriado/domingo trabajado) son dias extra trabajados, no ausencias:
    // no deben restar de "justificados/sin justificar" como si el empleado no hubiera venido.
    const attendanceRows = rows.filter(
      (row) => row.type !== AbsentType.FT && row.type !== AbsentType.DT
    );
    const totalDays = attendanceRows.reduce((acc, row) => acc + row.days, 0);
    const injustDays = attendanceRows.reduce((acc, row) => acc + (row.justified ? 0 : row.days), 0);
    const justDays = totalDays - injustDays;
    const affected = new Set(rows.map((row) => row.employeeId)).size;
    const pending = this.novedades().length;

    const share = (value: number) =>
      totalDays === 0 ? '0%' : `${Math.round((value / totalDays) * 100)}%`;

    return [
      {
        label: 'Ausencias del mes',
        value: rows.length,
        icon: 'event_busy',
        iconBg: 'rgba(4,104,215,0.1)',
        iconFg: '#0468d7',
        noteIcon: '',
        note: `${affected}`,
        noteFg: '#0468d7',
        noteText: affected === 1 ? 'empleado afectado' : 'empleados afectados',
      },
      {
        label: 'Días sin justificar',
        value: injustDays,
        icon: 'report',
        iconBg: '#ffcfc9',
        iconFg: '#b10202',
        noteIcon: '',
        note: share(injustDays),
        noteFg: '#b10202',
        noteText: 'de los días del mes',
      },
      {
        label: 'Días justificados',
        value: justDays,
        icon: 'check_circle',
        iconBg: '#d4edbc',
        iconFg: '#11734b',
        noteIcon: '',
        note: share(justDays),
        noteFg: '#11734b',
        noteText: 'de los días del mes',
      },
      {
        label: 'Novedades pendientes',
        value: pending,
        icon: 'inbox',
        iconBg: '#ecf2fd',
        iconFg: '#3d7dc7',
        noteIcon: '',
        note: pending > 0 ? 'Por procesar' : 'Al día',
        noteFg: '#3d7dc7',
        noteText: '',
      },
    ];
  });

  constructor(
    private absentService: AbsentService,
    private employeeService: EmployeeService,
    private viewsSvc: ViewsService,
    private router: Router,
    private utilsSvc: UtilsService,
    private appSvc: AppService,
    private novedadService: NovedadService,
    private absentDocRecordCreator: AbsentDocRecordCreatorService,
    private docsService: DocsService,
    private snackBar: MatSnackBar
  ) {
    this.searchFormControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.term.set(value?.trim() ?? '');
        this.page.set(0);
      });
  }

  ngOnInit(): void {
    this.loadAbsents();
    this.loadNovedades();
  }

  // ── Helpers de presentación ─────────────────────────────────────────────────

  private employeeCell(employeeId: string): EmployeeCellData {
    const employee = this.employees().find((emp) => emp.id === employeeId);
    const name = fullNameOf(employee) || 'Empleado no encontrado';
    return {
      name,
      nameTitle: this.toTitleCase(name),
      initials: this.initials(name),
      legajo: employee?.employeeId != null ? `N° ${employee.employeeId}` : 'N° —',
      sector: employee?.sector,
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

  /**
   * Las fechas llegan como yyyy-MM-dd; se cortan a mano para no depender del huso.
   * `Doc.uploadDate` esta tipado como Date pero por JSON llega string, asi que
   * acepta las dos formas.
   */
  private formatDate(value?: string | Date): string {
    if (!value) return '—';
    const text = value instanceof Date ? value.toISOString() : String(value);
    const [year, month, day] = text.split('T')[0].split('-');
    if (!year || !month || !day) return text;
    return `${day}/${month}/${year}`;
  }

  private shortDate(value?: string): string {
    if (!value) return '—';
    const [, month, day] = value.split('T')[0].split('-');
    if (!month || !day) return value;
    return `${day}/${month}`;
  }

  getStatTags(stat: EmployeeStat): { label: string; value: number; class: string }[] {
    return this.STAT_LABELS
      .filter(({ key }) => (stat[key] as number) > 0)
      .map(({ key, label, class: statClass }) => ({
        label,
        value: stat[key] as number,
        class: statClass
      }));
  }

  getAbsentFullName(type: AbsentType) {
    return this.utilsSvc.getAbstenFullName(type);
  }

  getEmployeeName(employeeId: string) {
    return fullNameOf(this.employees().find((emp) => emp.id === employeeId));
  }

  // ── Filtros y navegación ────────────────────────────────────────────────────

  setTab(tab: string) {
    this.tab.set(tab as TabKey);
    this.page.set(0);
  }

  isTypeSelected(type: AbsentType) {
    return this.typeFilters().includes(type);
  }

  /** Suma o saca un tipo de la seleccion, sin tocar los demas. */
  toggleType(type: AbsentType) {
    this.typeFilters.update((selected) =>
      selected.includes(type)
        ? selected.filter((item) => item !== type)
        : [...selected, type]
    );
    this.page.set(0);
  }

  clearTypes() {
    this.typeFilters.set([]);
    this.page.set(0);
  }

  setStatus(value: string) {
    this.status.set(value as StatusFilter);
    this.page.set(0);
  }

  toggleSort() {
    this.asc.update((value) => !value);
    this.page.set(0);
  }

  goToPage(page: number) {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  openAbsent(id: string) {
    this.router.navigate(['/main', 'app-pages', 'absents', id]);
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  openDatePickerDialog() {
    const dialogRef = this.dialog.open(DatepickerDialog, {
      disableClose: true,
      data: this.currentDate()
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.appSvc.setDateOfData(result);
      this.page.set(0);
      this.loadAbsents();
    });
  }

  openAddAbsentDialog() {
    const dialogRef = this.dialog.open(AddAbsentDialog, { disableClose: true });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadAbsents();
    });
  }

  onEditAbsent(row: AbsentRow, e: Event) {
    e.stopPropagation();
    const dialogRef = this.dialog.open(AddAbsentDialog, {
      disableClose: true,
      data: row.raw
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadAbsents();
    });
  }

  async onDeleteAbsent(row: AbsentRow, e: Event) {
    e.stopPropagation();
    const confirmed = await this.viewsSvc.prompt(
      'Eliminar ausencia',
      `¿Seguro que querés eliminar la ausencia de ${row.nameTitle}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    this.absentService.deleteAbsent(row.id).subscribe({
      next: () => this.loadAbsents(),
      error: (err) => console.error('Error al eliminar la ausencia:', err)
    });
  }

  openFile(docId: string, e: Event) {
    e.stopPropagation();
    this.utilsSvc.openFile(docId);
  }

  // ── Novedades ───────────────────────────────────────────────────────────────

  loadNovedades(): void {
    this.novedadService.getPending().subscribe({
      next: (list) => this.novedades.set(list),
      error: (err) => console.error('Error cargando novedades', err)
    });
  }

  uploadNovedad(): void {
    const ref = this.dialog.open(AddDocDialog, {
      disableClose: true,
      panelClass: 'full-screen-dialog',
    });
    ref.afterClosed().subscribe((doc: Doc | undefined) => {
      if (!doc?.id) return;
      this.novedadService.create(doc.id).subscribe({
        next: () => {
          this.snackBar.open('Novedad cargada correctamente', 'OK', { duration: 2000 });
          this.loadNovedades();
        },
        error: (err) => {
          console.error('Error al cargar la novedad', err);
          this.snackBar.open('Error al cargar la novedad', 'OK', { duration: 3000 });
        }
      });
    });
  }

  /**
   * `e` falta cuando se llama desde flux-m3-list-item (itemClick no trae un
   * Event nativo): ahi el item entero es el unico manejador de click, asi
   * que no hace falta stopPropagation.
   */
  viewNovedadFile(doc: Doc, e?: Event): void {
    e?.stopPropagation();
    this.dialog.open(FileViewerDialog, {
      panelClass: 'full-screen-dialog',
      data: { driveFileId: doc.driveFileId, title: doc.description || this.utilsSvc.getDocFullName(doc.type) }
    });
  }

  convertToAbsent(row: NovedadRow, e: Event): void {
    e.stopPropagation();
    this.absentDocRecordCreator.create(row.doc).subscribe((result) => {
      if (result) {
        this.loadNovedades();
        this.loadAbsents();
      }
    });
  }

  async discardNovedad(row: NovedadRow, e: Event) {
    e.stopPropagation();
    const confirmed = await this.viewsSvc.prompt(
      'Descartar novedad',
      'El documento no se borra, solo sale de la cola de novedades. ¿Continuamos?'
    );
    if (!confirmed) return;
    this.novedadService.discard(row.id).subscribe({
      next: () => this.loadNovedades(),
      error: (err) => {
        console.error('Error al descartar la novedad', err);
        this.snackBar.open('Error al descartar la novedad', 'OK', { duration: 3000 });
      }
    });
  }

  // ── Exportación ─────────────────────────────────────────────────────────────

  /** Exporta la pestaña activa (todas las filas filtradas, no solo la página). */
  exportCsv() {
    const tab = this.tab();
    let header: string[] = [];
    let rows: string[][] = [];

    if (tab === 'novedades') {
      header = ['Legajo', 'Empleado', 'Tipo', 'Descripción', 'Fecha'];
      rows = this.filteredNovedades().map((row) => [
        row.legajo.replace('N° ', ''),
        row.name,
        this.utilsSvc.getDocFullName(row.doc.type) ?? '',
        row.description,
        row.uploadDate,
      ]);
    } else if (tab === 'stats') {
      header = ['Legajo', 'Empleado', 'Total días', 'Días sin justificar', 'Suspensión', 'Licencia', 'FT', 'DT', 'ART', 'Vacaciones'];
      rows = this.filteredStats().map((row) => [
        row.legajo.replace('N° ', ''),
        row.name,
        String(row.stat.total),
        String(row.stat.totalInjust),
        String(row.stat.suspension),
        String(row.stat.license),
        String(row.stat.ft),
        String(row.stat.dt),
        String(row.stat.art),
        String(row.stat.vacations),
      ]);
    } else {
      header = ['Legajo', 'Empleado', 'Tipo', 'Período', 'Días', 'Estado'];
      rows = this.filteredAbsents().map((row) => [
        row.legajo.replace('N° ', ''),
        row.name,
        this.getAbsentFullName(row.type) ?? '',
        row.period.replace('→', 'a'),
        String(row.days),
        row.justified ? 'Justificada' : 'Sin justificar',
      ]);
    }

    if (rows.length === 0) return;

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      header.join(';'),
      ...rows.map((row) => row.map(escape).join(';')),
    ].join('\r\n');

    // BOM para que Excel abra los acentos bien.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${tab}-${this.monthSuffix()}.csv`);
  }

  /**
   * ZIP con los adjuntos de las ausencias filtradas (no solo la pagina), un archivo por
   * ausencia. El armado lo hace el back: bajar N archivos de Drive desde el navegador
   * serian dos requests por ausencia y sin forma de saber la extension real.
   */
  exportFiles() {
    if (this.isExportingFiles()) return;

    const rows = this.filteredAbsents();
    const withDoc = rows.filter((row) => !!row.docId);
    const skipped = rows.length - withDoc.length;

    if (withDoc.length === 0) {
      this.snackBar.open('Ninguna de las ausencias filtradas tiene archivo adjunto', 'OK', { duration: 3000 });
      return;
    }

    // Los nombres se arman aca y no en el back: las etiquetas de tipo y estado son
    // las mismas que el usuario ve en la tabla y viven en el front.
    const files = withDoc.map((row) => ({
      docId: row.docId,
      name: `${row.name} - ${this.getAbsentFullName(row.type) ?? row.type} - ${row.justified ? 'Justificada' : 'Sin justificar'}`,
    }));

    const zipName = `ausencias-${this.monthSuffix()}.zip`;

    this.isExportingFiles.set(true);
    this.docsService.exportZip(zipName, files).subscribe({
      next: (blob) => {
        this.isExportingFiles.set(false);
        this.downloadBlob(blob, zipName);
        this.snackBar.open(
          skipped === 0
            ? `${files.length} ${files.length === 1 ? 'archivo exportado' : 'archivos exportados'}`
            : `${files.length} exportados · ${skipped} sin archivo adjunto`,
          'OK',
          { duration: 4000 }
        );
      },
      error: (err) => {
        this.isExportingFiles.set(false);
        console.error('Error exportando los archivos', err);
        this.snackBar.open('No se pudieron exportar los archivos', 'OK', { duration: 3000 });
      },
    });
  }

  private monthSuffix(): string {
    const { year, month } = this.currentDate();
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Carga de datos ──────────────────────────────────────────────────────────

  loadAbsents(): void {
    this.isLoading.set(true);
    this.absentService.getAbsentsByMonth(this.currentDate().year, this.currentDate().month).subscribe({
      next: (response) => {
        this.absentOfMonth.set([...response].reverse());
        this.generateCalendar(this.currentDate().year, this.currentDate().month);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando ausencias', err);
        this.isLoading.set(false);
      }
    });
  }

  // ── Calendario ──────────────────────────────────────────────────────────────

  onAbsentClick(id: string) {
    const allChips = document.querySelectorAll('[absent-id]');
    allChips.forEach(el => el.classList.add('unselected'));
    const els = document.querySelectorAll('[absent-id="' + id + '"]');
    els.forEach(el => {
      el.classList.remove('unselected');
      el.classList.add('highlight');
    });
  }

  onAbsentLeave(id: string) {
    const allChips = document.querySelectorAll('[absent-id]');
    allChips.forEach(el => {
      el.classList.remove('unselected');
      el.classList.remove('highlight');
    });
  }

  generateCalendar(year: number, month: number) {
    this.daysOfMonth.set([]);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonthYear = today.getFullYear() === year && (today.getMonth() + 1) === month;

    for (let i = 0; i < firstDay; i++) {
      this.daysOfMonth.update(prev => [...prev, { day: null, currentMonth: false }]);
    }

    for (let i = 1; i <= totalDays; i++) {
      this.daysOfMonth.update(prev => [...prev, {
        day: i,
        currentMonth: true,
        hasAbsence: this.checkAbsence(i),
        absences: this.getAbsencesForDay(i),
        isToday: isCurrentMonthYear && today.getDate() === i
      }]);
    }

    const remainingDays = 5 - this.daysOfMonth.length;
    for (let i = 2; i <= remainingDays; i++) {
      this.daysOfMonth.update(prev => [...prev, { day: null, currentMonth: false }]);
    }
  }

  getAbsencesForDay(day: number): AbsentResponseDTO[] {
    if (!day) return [];
    const absences = this.absentOfMonth();

    const dateToCheck = new Date(this.currentDate().year, this.currentDate().month - 1, day);
    dateToCheck.setHours(0, 0, 0, 0);

    return absences.filter(abs => {
      // 'T00:00:00' fuerza hora local: sin eso JS lo interpreta como UTC y corre un dia.
      const start = new Date(abs.originalStartDate + 'T00:00:00');
      const end = new Date(abs.originalEndDate + 'T00:00:00');
      return (dateToCheck >= start && dateToCheck <= end);
    });
  }

  checkAbsence(day: number) {
    return this.getAbsencesForDay(day);
  }
}
