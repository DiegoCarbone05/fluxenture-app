import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddAbsentDialog } from '../../dialogs/add-absent-dialog/add-absent-dialog';
import { AbsentResponseDTO } from '../../../shared/models/AbsentResponseDTO';
import { AbsentService } from '../../../core/services/absents/absent.service';
import { EmployeeService } from '../../../core/services/employees/employee.service';

@Component({
  selector: 'app-absents',
  standalone: false,
  templateUrl: './absents.html',
  styleUrl: './absents.scss'
})
export class Absents implements OnInit {
  private readonly dialog = inject(MatDialog);
  absentOfMonth = signal<AbsentResponseDTO[]>([]);

  constructor(private absentService: AbsentService, private employeeService: EmployeeService) { }

  openAddAbsentDialog() {
    const dialogRef = this.dialog.open(AddAbsentDialog, {
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(
      {
        next: (response) => {
          if (response) {
            this.absentOfMonth.update(absences => [...absences, response]);
            this.generateCalendar(this.currentDate.year, this.currentDate.month);
          }
        }
      }
    );
  }

  currentDate = {
    year: 2026,
    month: 3
  }
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
    this.absentService.getAbsentsByMonth(this.currentDate.year, this.currentDate.month).subscribe(
      {
        next: (response) => {
          this.absentOfMonth.set(response);
          this.generateCalendar(this.currentDate.year, this.currentDate.month);
        }
      }
    );
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
    for (let i = 1; i <= remainingDays; i++) {
      this.daysOfMonth.update(prev => [...prev, { day: null, currentMonth: false }]);
    }

  }

  // En tu componente.ts
  // absences: AbsentResponseDTO[] = []; // Lo que traés del Back

  getAbsencesForDay(day: number): AbsentResponseDTO[] {
    if (!day) return [];
    const absences = this.absentOfMonth();

    // 1. Fecha del cuadradito (ya es Local 00:00:00)
    const dateToCheck = new Date(this.currentDate.year, this.currentDate.month - 1, day);
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
