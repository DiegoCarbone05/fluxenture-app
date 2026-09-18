import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { AbsentService } from '../../../core/services/api/absents/absent.service';
import { EmployeeDraftService } from '../../../core/services/employee-draft.service';
import { ViewsService } from '../../views.service';
import { AddEmployee } from '../../dialogs/add-employee/add-employee';
import { EmployeeDrafts } from '../../dialogs/employee-drafts/employee-drafts';
import { Employee, ESector } from '../../../shared/models/Employee';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';
import { EMPLOYEE_SECTOR } from '../../../shared/constants/typesValues.constant';
import { EmpSectorPipePipe } from '../../../shared/pipes/emp-sector-pipe-pipe';
import { fullNameOf } from '../../../shared/models/Employee';
import { WorkServicesService } from '../../../core/services/api/work-services/work-services.service';
import { ManageServices } from '../../dialogs/manage-services/manage-services';
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

type SectorFilter = 'todos' | ESector;
/** 'todos' | 'sin' (sin servicio asignado) | el nombre del servicio */
type ServiceFilter = string;
type StatusFilter = 'todos' | 'operativos' | 'inactivos';

/** Fila ya derivada para la vista: evita repetir helpers dentro del template. */
export interface EmployeeRow {
  id: string;
  name: string;
  nameTitle: string;
  initials: string;
  legajo: string;
  sector?: ESector;
  /** Servicio/objetivo asignado. '—' cuando el empleado todavia no tiene ninguno. */
  service: string;
  email: string;
  phone: string;
  entryDate: string;
  isOperational: boolean;
}

const PAGE_SIZE = 12;

@Component({
  selector: 'app-eployees',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, EmpSectorPipePipe,
    PageHeader, PillButton, IconButton, SearchBox, TableToolbar, EmployeeCell,
    StatusChip, StatsGrid, TablePager, EmptyState, M3SearchBar, M3StatsRow,
    M3ListItem, FilterChips, FabButton, RowActions,
  ],
  templateUrl: './eployees.html',
  styleUrl: './eployees.scss'
})
export class Eployees {

  private readonly dialog = inject(MatDialog);

  isMobile = computed(() => this.viewsSvc.getIsMobile());

  readonly sectors = EMPLOYEE_SECTOR;
  /** Solo los vigentes en el desplegable; los archivados igual se muestran en la tabla. */
  serviceOptions = computed(() => this.workServicesSvc.getActiveServices());
  readonly pageSize = PAGE_SIZE;

  searchFormControl = new FormControl<string>('');

  // ── Estado de filtros ───────────────────────────────────────────────────────
  term = signal<string>('');
  sector = signal<SectorFilter>('todos');
  service = signal<ServiceFilter>('todos');
  status = signal<StatusFilter>('todos');
  asc = signal<boolean>(true);
  page = signal<number>(0);

  private absentsThisMonth = signal<number>(0);

  employees = computed(() => this.employeeService.getEmployeesSignal()());
  draftCount = computed(() => this.draftService.getDraftsSignal()().length);

  /** Todos los empleados normalizados a fila de vista. */
  private rows = computed<EmployeeRow[]>(() =>
    this.employees().map((emp) => this.toRow(emp))
  );

  /** Los tres filtros se combinan con AND, y despues se ordena por nombre. */
  filtered = computed<EmployeeRow[]>(() => {
    const term = this.term().trim().toLowerCase();
    const sector = this.sector();
    const service = this.service();
    const status = this.status();

    const result = this.rows().filter((row) => {
      if (sector !== 'todos' && row.sector !== sector) return false;
      if (service === 'sin' && row.service !== '—') return false;
      if (service !== 'todos' && service !== 'sin' && row.service !== service) return false;
      if (status === 'operativos' && !row.isOperational) return false;
      if (status === 'inactivos' && row.isOperational) return false;
      if (term) {
        const haystack = [row.name, row.legajo, row.phone, row.email, row.service]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const asc = this.asc();
    return result.sort((a, b) =>
      asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  /** Paginas visibles en el pie: hasta 3, centradas en la actual. */
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(0, Math.min(current - 1, total - 3));
    return Array.from({ length: Math.min(3, total) }, (_, i) => start + i);
  });

  /** La pagina puede quedar fuera de rango al filtrar; se acota al leerla. */
  currentPage = computed(() => Math.min(this.page(), this.totalPages() - 1));

  paged = computed(() => {
    const start = this.currentPage() * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return 'Sin resultados';
    const start = this.currentPage() * PAGE_SIZE + 1;
    const end = Math.min(start + PAGE_SIZE - 1, total);
    return `${start} – ${end} de ${total} empleados`;
  });

  resultsLabel = computed(() => {
    const n = this.filtered().length;
    return n === 1 ? '1 resultado' : `${n} resultados`;
  });

  subtitle = computed(() => {
    const total = this.rows().length;
    const operativos = this.paged().filter((row) => row.isOperational).length;
    return `${total} empleados · ${operativos} operativos en esta página`;
  });

  sortLabel = computed(() => (this.asc() ? 'A → Z' : 'Z → A'));


  /**
   * Las cuatro metricas del encabezado. La linea inferior no muestra una
   * variacion contra el mes anterior porque no existe historico: en su lugar
   * lleva un dato real derivado de la misma plantilla.
   */
  stats = computed<StatCardData[]>(() => {
    const rows = this.rows();
    const total = rows.length;
    const operativos = rows.filter((row) => row.isOperational).length;
    const inactivos = total - operativos;
    const altas = this.entriesThisMonth();
    const ausentes = this.absentsThisMonth();

    const share = (value: number) =>
      total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;

    return [
      {
        label: 'Total empleados',
        value: total,
        icon: 'groups',
        iconBg: 'rgba(4,104,215,0.1)',
        iconFg: '#0468d7',
        noteIcon: altas > 0 ? 'trending_up' : '',
        note: altas > 0 ? `+${altas}` : '0',
        noteFg: altas > 0 ? '#11734b' : '#9aa0ac',
        noteText: 'altas este mes',
      },
      {
        label: 'Operativos',
        value: operativos,
        icon: 'check_circle',
        iconBg: '#d4edbc',
        iconFg: '#11734b',
        noteIcon: '',
        note: share(operativos),
        noteFg: '#11734b',
        noteText: 'de la plantilla',
      },
      {
        label: 'Ausentes del mes',
        value: ausentes,
        icon: 'event_busy',
        iconBg: '#ecf2fd',
        iconFg: '#3d7dc7',
        noteIcon: '',
        note: share(ausentes),
        noteFg: '#3d7dc7',
        noteText: 'de la plantilla',
      },
      {
        label: 'Inactivos',
        value: inactivos,
        icon: 'person_off',
        iconBg: '#ffcfc9',
        iconFg: '#b10202',
        noteIcon: '',
        note: share(inactivos),
        noteFg: '#b10202',
        noteText: 'de la plantilla',
      },
    ];
  });

  readonly chips: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'operativos', label: 'Operativos' },
    { key: 'inactivos', label: 'Inactivos' },
  ];

  constructor(
    private employeeService: EmployeeService,
    private absentService: AbsentService,
    private viewsSvc: ViewsService,
    private router: Router,
    private route: ActivatedRoute,
    private draftService: EmployeeDraftService,
    private workServicesSvc: WorkServicesService,
  ) {
    this.route.queryParams.subscribe((params) => {
      const searchValue: string = params['q']?.trim() ?? '';
      if (searchValue !== this.searchFormControl.value) {
        this.searchFormControl.setValue(searchValue, { emitEvent: false });
      }
      this.term.set(searchValue);
      this.page.set(0);
    });

    this.searchFormControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        const term = value?.trim() ?? '';
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: term },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });

    this.loadAbsentsOfMonth();
  }

  // ── Datos derivados ─────────────────────────────────────────────────────────

  /** Empleados cuya fecha de ingreso cae en el mes en curso. */
  private entriesThisMonth(): number {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.employees().filter((emp) => emp.entryDate?.startsWith(prefix)).length;
  }

  /** Cantidad de empleados distintos con al menos una ausencia en el mes. */
  private loadAbsentsOfMonth() {
    const now = new Date();
    this.absentService.getAbsentsByMonth(now.getFullYear(), now.getMonth() + 1).subscribe({
      next: (absents) => {
        const ids = new Set(absents.map((absent) => absent.employeeId));
        this.absentsThisMonth.set(ids.size);
      },
      error: (err) => console.error('Error cargando ausencias del mes', err),
    });
  }

  private toRow(emp: EmployeeDTO): EmployeeRow {
    // Se muestra el nombre completo (APELLIDO NOMBRES): despues del split, emp.name
    // son solo los nombres de pila, y los registros viejos siguen trayendolo entero.
    const fullName = fullNameOf(emp);
    return {
      id: emp.id,
      name: fullName,
      nameTitle: this.toTitleCase(fullName),
      initials: this.initials(fullName),
      legajo: emp.employeeId != null ? `N° ${emp.employeeId}` : 'N° —',
      sector: emp.sector,
      service: emp.service || '—',
      email: emp.email || '—',
      phone: emp.cellPhone || emp.phone || '—',
      entryDate: this.formatDate(emp.entryDate),
      isOperational: emp.isOperational !== false,
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

  /** El backend manda LocalDate ISO (yyyy-MM-dd); se corta a mano para no depender del huso. */
  private formatDate(value?: string): string {
    if (!value) return '—';
    const [date] = value.split('T');
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  }

  // ── Acciones de filtro ──────────────────────────────────────────────────────

  setSector(value: string) {
    this.sector.set(value as SectorFilter);
    this.page.set(0);
  }

  setService(value: string) {
    this.service.set(value);
    this.page.set(0);
  }

  openServicesDialog() {
    this.dialog.open(ManageServices, { panelClass: 'custom-flex-dialog' });
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

  /** Descarga los empleados filtrados (todos, no solo la pagina) como CSV. */
  exportCsv() {
    const rows = this.filtered();
    if (rows.length === 0) return;

    const header = ['Legajo', 'Nombre', 'Sector', 'Servicio', 'Email', 'Teléfono', 'Ingreso', 'Estado'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const sectorLabel = (sector?: ESector) =>
      EMPLOYEE_SECTOR.find((item) => item.value === sector)?.label ?? '';

    const csv = [
      header.join(';'),
      ...rows.map((row) =>
        [
          row.legajo.replace('N° ', ''),
          row.name,
          sectorLabel(row.sector),
          row.service,
          row.email,
          row.phone,
          row.entryDate,
          row.isOperational ? 'Operativo' : 'Inactivo',
        ].map(escape).join(';')
      ),
    ].join('\r\n');

    // BOM para que Excel abra los acentos bien.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `empleados-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Acciones sobre empleados ────────────────────────────────────────────────

  openEmployee(row: EmployeeRow) {
    this.router.navigate(['/main', 'app-pages', 'eployees', row.id]);
  }

  viewEmployee(event: Event, row: EmployeeRow) {
    event.stopPropagation();
    this.openEmployee(row);
  }

  /** El listado trae un DTO reducido: para editar hay que pedir el empleado completo. */
  editEmployee(event: Event, row: EmployeeRow) {
    event.stopPropagation();
    this.employeeService.getEmployeeById(row.id).subscribe({
      next: (employee) => this.openAddEmployeeDialog(undefined, employee),
      error: (err) => console.error('Error cargando el empleado', err),
    });
  }

  async deleteEmployee(event: Event, row: EmployeeRow) {
    event.stopPropagation();
    const confirmed = await this.viewsSvc.prompt(
      'Eliminar empleado',
      `¿Seguro que querés eliminar a ${row.nameTitle}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    this.employeeService.deleteEmployee(row.id).subscribe({
      error: (err) => console.error('Error eliminando el empleado', err),
    });
  }

  openAddEmployeeDialog(draftId?: string, employee?: Employee) {
    const dialog = this.dialog.open(AddEmployee, {
      panelClass: 'full-screen-dialog',
      disableClose: true,
      data: draftId || employee ? { draftId, employee } : undefined,
    });

    dialog.afterClosed().subscribe((result: Employee | undefined) => {
      if (!result) return;
      if (result.id) {
        this.employeeService.updateEmployee(result.id, result).subscribe();
      } else {
        this.employeeService.createEmployee(result).subscribe();
      }
    });
  }

  openDraftsDialog() {
    const dialog = this.dialog.open(EmployeeDrafts, {
      panelClass: 'custom-flex-dialog',
    });

    dialog.afterClosed().subscribe((draftId: string | undefined) => {
      if (draftId) this.openAddEmployeeDialog(draftId);
    });
  }
}
