import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AbstentTypePipe } from '../../../shared/pipes/abstent-type-pipe';
import { DocTypePipe } from '../../../shared/pipes/doc-type-pipe';
import { Toolbar } from '../../../shared/components/toolbar/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { AddAbsentDialog } from '../../dialogs/add-absent-dialog/add-absent-dialog';
import { AddDocDialog } from '../../dialogs/add-doc-dialog/add-doc-dialog';
import { FileViewerDialog } from '../../dialogs/file-viewer-dialog/file-viewer-dialog';
import { AbsentResponseDTO } from '../../../shared/models/AbsentResponseDTO';
import { AbsentService } from '../../../core/services/api/absents/absent.service';
import { AbsentDocRecordCreatorService } from '../../../core/services/api/absents/absent-doc-record-creator.service';
import { NovedadService } from '../../../core/services/api/novedades/novedad.service';
import { NovedadResponseDTO } from '../../../shared/models/Novedad';
import { Doc } from '../../../shared/models/Doc';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Router } from '@angular/router';
import { DatepickerDialog } from '../../dialogs/datepicker-dialog/datepicker-dialog';
import { UtilsService } from '../../../core/services/utils.service';
import { AbsentType } from '../../../shared/models/Absent.model';
import { MONTHS, YEARS } from '../../../shared/constants/general-constant';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { AppService } from '../../../core/services/app.service';

interface EmployeeStat {
  employeeId: string;
  justified: number;
  sinAviso: number;
  suspension: number;
  license: number;
  ft: number;
  art: number;
  vacations: number;
  totalInjust: number;
  total: number;
}

@Component({
  selector: 'app-absents',
  standalone: true,
  imports: [
    CommonModule, MatTabsModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatProgressSpinnerModule, MatTooltipModule, MatSnackBarModule,
    AbstentTypePipe, DocTypePipe, Toolbar,
  ],
  templateUrl: './absents.html',
  styleUrl: './absents.scss'
})
export class Absents implements OnInit {
  private readonly dialog = inject(MatDialog);
  absentOfMonth = signal<AbsentResponseDTO[]>([]);
  currentDate = computed(() => this.appSvc.dateOfData());

  readonly STAT_LABELS: { key: keyof EmployeeStat; label: string; class: string }[] = [
    { key: 'justified', label: 'Justificada', class: 'justified' },
    { key: 'sinAviso', label: 'Sin Aviso', class: 'unjustified' },
    { key: 'suspension', label: 'Suspensión', class: 'suspension' },
    { key: 'totalInjust', label: 'T.Inj.', class: 'total-injust' },
    { key: 'license', label: 'Licencia', class: 'license' },
    { key: 'ft', label: 'FT', class: 'ft' },
    { key: 'art', label: 'ART', class: 'art' },
    { key: 'vacations', label: 'Vacaciones', class: 'vacations' },
  ];

  getStatTags(stat: EmployeeStat): { label: string; value: number; class: string }[] {
    const warnKeys = new Set(['sinAviso', 'suspension', 'totalInjust']);
    return this.STAT_LABELS
      .filter(({ key }) => (stat[key] as number) > 0)
      .map(({ key, label, class: statClass }) => ({
        label,
        value: stat[key] as number,
        class: statClass
      }));
  }

  employeeStats = computed((): EmployeeStat[] => {
    const statsMap = new Map<string, EmployeeStat>();

    for (const abs of this.absentOfMonth()) {
      if (!statsMap.has(abs.employeeId)) {
        statsMap.set(abs.employeeId, {
          employeeId: abs.employeeId,
          justified: 0, sinAviso: 0, suspension: 0,
          license: 0, ft: 0, art: 0, vacations: 0,
          totalInjust: 0, total: 0
        });
      }
      const stat = statsMap.get(abs.employeeId)!;
      const days = abs.impactDaysInMonth;

      switch (abs.type) {
        case AbsentType.SUSPENSION: stat.suspension += days; break;
        case AbsentType.LICENSE: stat.license += days; break;
        case AbsentType.FT: stat.ft += days; break;
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

  constructor(
    private absentService: AbsentService,
    private employeeService: EmployeeService,
    private router: Router,
    private utilsSvc: UtilsService,
    private docsService: DocsService,
    private appSvc: AppService,
    private novedadService: NovedadService,
    private absentDocRecordCreator: AbsentDocRecordCreatorService,
    private snackBar: MatSnackBar
  ) {
  }

  getAbsentFullName(type: AbsentType) {
    return this.utilsSvc.getAbstenFullName(type);
  }

  openAddAbsentDialog() {
    const dialogRef = this.dialog.open(AddAbsentDialog, {
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(
      {
        next: (result) => {
          if (result) {
            this.loadAbsents();
          }
        }
      }
    );
  }

  openAbsent(id: string) {
    this.router.navigate(['/main', "app-pages", 'absents', id]);
  }

  openFile(docId: string, e: Event) {
    e.stopPropagation();
    this.utilsSvc.openFile(docId);

  }

  onEditAbsent(absent: AbsentResponseDTO, e: Event) {
    e.stopPropagation();
    const dialogRef = this.dialog.open(AddAbsentDialog, {
      disableClose: true,
      data: absent
    });
    dialogRef.afterClosed().subscribe(
      {
        next: (result) => {
          if (result) {
            this.loadAbsents();
          }
        }
      }
    );
  }

  onDeleteAbsent(id: string, e: Event) {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar esta ausencia?')) {
      this.absentService.deleteAbsent(id).subscribe({
        next: () => {
          this.loadAbsents();
        },
        error: (err) => {
          console.error('Error al eliminar la ausencia:', err);
        }
      });
    }
  }

  openDatePickerDialog() {
    const dialogRef = this.dialog.open(DatepickerDialog, {
      disableClose: true,
      data: this.currentDate()
    });
    dialogRef.afterClosed().subscribe(
      {
        next: (result) => {
          if (result) {
            this.appSvc.setDateOfData(result)
            this.loadAbsents();
          }
        }
      }
    );
  }

  months = MONTHS
  years = YEARS;

  // En tu componente .ts
  daysOfMonth = signal<any[]>([]);

  onAbsentClick(id: string) {
    const allChips = document.querySelectorAll('[absent-id]');
    allChips.forEach(el => {
      el.classList.add('unselected');
    });
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

  ngOnInit(): void {
    this.loadAbsents();
    this.loadNovedades();
  }

  // ── Novedades ─────────────────────────────────────────────────────────────

  activeTabIndex = signal(0);
  novedades = signal<NovedadResponseDTO[]>([]);

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

  viewNovedadFile(doc: Doc, e: Event): void {
    e.stopPropagation();
    this.dialog.open(FileViewerDialog, {
      panelClass: 'full-screen-dialog',
      data: { driveFileId: doc.driveFileId, title: doc.description || this.utilsSvc.getDocFullName(doc.type) }
    });
  }

  convertToAbsent(novedad: NovedadResponseDTO, e: Event): void {
    e.stopPropagation();
    this.absentDocRecordCreator.create(novedad.doc).subscribe((result) => {
      if (result) {
        this.loadNovedades();
        this.loadAbsents();
      }
    });
  }

  discardNovedad(novedad: NovedadResponseDTO, e: Event): void {
    e.stopPropagation();
    if (!confirm('¿Descartar esta novedad? El documento no se borra, solo sale de la cola.')) return;
    this.novedadService.discard(novedad.id).subscribe({
      next: () => this.loadNovedades(),
      error: (err) => {
        console.error('Error al descartar la novedad', err);
        this.snackBar.open('Error al descartar la novedad', 'OK', { duration: 3000 });
      }
    });
  }

  loadAbsents(): void {
    this.absentService.getAbsentsByMonth(this.currentDate().year, this.currentDate().month).subscribe(
      {
        next: (response) => {
          this.absentOfMonth.set(response.reverse());
          this.generateCalendar(this.currentDate().year, this.currentDate().month);
        }
      }
    );
  }

  onDateChange() {
    this.loadAbsents();
  }

  getEmployeeName(employeeId: string) {
    const employee = this.employeeService.getLocalEmployeeById(employeeId);
    return employee?.name;
  }

  getEmployeeId(employeeId: string) {
    const employee = this.employeeService.getLocalEmployeeById(employeeId);
    return employee?.employeeId;
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

  // En tu componente.ts
  // absences: AbsentResponseDTO[] = []; // Lo que traés del Back

  getAbsencesForDay(day: number): AbsentResponseDTO[] {
    if (!day) return [];
    const absences = this.absentOfMonth();

    // 1. Fecha del cuadradito (ya es Local 00:00:00)
    const dateToCheck = new Date(this.currentDate().year, this.currentDate().month - 1, day);
    dateToCheck.setHours(0, 0, 0, 0); // Limpiamos por las dudas

    return absences.filter(abs => {
      // 2. TRUCO: Agregamos 'T00:00:00' para que JS lo tome como HORA LOCAL y no UTC
      const start = new Date(abs.originalStartDate + 'T00:00:00');
      const end = new Date(abs.originalEndDate + 'T00:00:00');

      // 3. Ahora la comparación es de igual a igual (Local vs Local)
      return (dateToCheck >= start && dateToCheck <= end);
    });
  }

  checkAbsence(day: number) {
    const absences = this.getAbsencesForDay(day);

    return absences;
  }
}
