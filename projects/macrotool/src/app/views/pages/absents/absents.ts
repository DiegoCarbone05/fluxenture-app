import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddAbsentDialog } from '../../dialogs/add-absent-dialog/add-absent-dialog';
import { AbsentResponseDTO } from '../../../shared/models/AbsentResponseDTO';
import { AbsentService } from '../../../core/services/absents/absent.service';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { Router } from '@angular/router';
import { DatepickerDialog } from '../../dialogs/datepicker-dialog/datepicker-dialog';
import { UtilsService } from '../../../core/services/utils.service';
import { AbsentType } from '../../../shared/models/Absent.model';
import { MONTHS, YEARS } from '../../../shared/constants/general-constant';
import { DocsService } from '../../../core/services/docs/docs.service';
import { AppService } from '../../../core/services/app.service';

@Component({
  selector: 'app-absents',
  standalone: false,
  templateUrl: './absents.html',
  styleUrl: './absents.scss'
})
export class Absents implements OnInit {
  private readonly dialog = inject(MatDialog);
  absentOfMonth = signal<AbsentResponseDTO[]>([]);
  currentDate = computed(() => this.appSvc.dateOfData());

  constructor(
    private absentService: AbsentService,
    private employeeService: EmployeeService,
    private router: Router,
    private utilsSvc: UtilsService,
    private docsService: DocsService,
    private appSvc: AppService
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
    if (docId == "") return;

    const link = document.createElement('a');

    this.docsService.getDoc(docId).subscribe({
      next: (doc) => {
        console.log(doc);
        link.href = 'https://drive.google.com/file/d/' + doc.driveFileId + '/view';
        link.target = '_blank';
        link.click();
      },
      error: (err) => {
        console.error('Error cargando doc', err);
        link.href = 'https://drive.google.com/file/d/' + docId + '/view';
        link.target = '_blank';
        link.click();
      }
    });
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

  generateCalendar(year: number, month: number) {
    this.daysOfMonth.set([]);
    const firstDay = new Date(year, month - 1, 1).getDay(); // Qué día de la semana cae el 1
    const totalDays = new Date(year, month, 0).getDate();    // Cuántos días tiene el mes

    console.log("AAA");


    // 1. Celdas vacías (o del mes anterior) para alinear el día 1
    for (let i = 0; i < firstDay; i++) {
      this.daysOfMonth.update(prev => [...prev, { day: null, currentMonth: false }]);
    }

    // 2. Los días del mes actual
    for (let i = 1; i <= totalDays; i++) {
      this.daysOfMonth.update(prev => [...prev, {
        day: i,
        currentMonth: true,
        // Aquí después podés filtrar tus 'absences' para ver si este día tiene una
        hasAbsence: this.checkAbsence(i),
        absences: this.getAbsencesForDay(i)
      }]);

    }

    // 3. Celdas vacías (o del mes siguiente) para completar las 6 filas
    const remainingDays = 5 - this.daysOfMonth.length; // 42 = 6 filas * 7 días
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
