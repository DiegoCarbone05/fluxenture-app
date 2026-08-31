import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';

import { WorkServicesService } from '../../../core/services/api/work-services/work-services.service';
import { WorkService } from '../../../shared/models/WorkService';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Prompt } from '../prompt/prompt';

@Component({
  selector: 'app-manage-services',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './manage-services.html',
  styleUrl: './manage-services.scss',
})
export class ManageServices {
  private readonly dialogRef = inject(MatDialogRef<ManageServices>);
  private readonly servicesSvc = inject(WorkServicesService);
  private readonly employeeSvc = inject(EmployeeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  newName = new FormControl('', Validators.required);
  /** Id del servicio que se esta renombrando, o null si no hay ninguno en edicion. */
  editingId = signal<string | null>(null);
  editName = new FormControl('', Validators.required);
  saving = signal(false);

  services = computed(() => this.servicesSvc.getServicesSignal());
  activeCount = computed(() => this.services().filter((s) => s.active).length);

  /** Cuantos empleados tiene cada servicio, contado sobre el cache local. */
  private counts = computed(() => {
    const map = new Map<string, number>();
    for (const emp of this.employeeSvc.getEmployeesSignal()()) {
      if (!emp.service) continue;
      map.set(emp.service, (map.get(emp.service) ?? 0) + 1);
    }
    return map;
  });

  employeesIn(service: WorkService): number {
    return this.counts().get(service.name) ?? 0;
  }

  add() {
    const name = (this.newName.value ?? '').trim();
    if (!name) return;

    this.saving.set(true);
    this.servicesSvc.create(name).subscribe({
      next: () => {
        this.newName.reset('');
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error?.message ?? 'No se pudo crear el servicio', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  startEdit(service: WorkService) {
    this.editingId.set(service.id);
    this.editName.setValue(service.name);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  confirmEdit(service: WorkService) {
    const name = (this.editName.value ?? '').trim();
    if (!name || name === service.name) {
      this.cancelEdit();
      return;
    }

    const afectados = this.employeesIn(service);
    const detalle = afectados === 1 ? '1 empleado' : `${afectados} empleados`;

    this.dialog.open(Prompt, {
      data: {
        title: 'Renombrar servicio',
        desc: `"${service.name}" pasa a llamarse "${name}". El cambio se aplica también a ${detalle}.`,
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.saving.set(true);
      this.servicesSvc.rename(service.id, name).subscribe({
        next: () => {
          this.employeeSvc.refreshEmployees().subscribe();
          this.cancelEdit();
          this.saving.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open(err.error?.message ?? 'No se pudo renombrar', 'OK', { duration: 3000 });
          this.saving.set(false);
        },
      });
    });
  }

  toggleActive(service: WorkService) {
    const afectados = this.employeesIn(service);

    if (service.active && afectados > 0) {
      const detalle = afectados === 1 ? '1 empleado lo tiene' : `${afectados} empleados lo tienen`;
      this.dialog.open(Prompt, {
        data: {
          title: 'Archivar servicio',
          desc: `${detalle} asignado. Van a conservarlo, pero el servicio deja de ofrecerse para nuevas asignaciones. ¿Continuar?`,
        },
      }).afterClosed().subscribe((ok) => {
        if (ok) this.applyActive(service, false);
      });
      return;
    }

    this.applyActive(service, !service.active);
  }

  private applyActive(service: WorkService, value: boolean) {
    this.saving.set(true);
    this.servicesSvc.setActive(service.id, value).subscribe({
      next: () => this.saving.set(false),
      error: () => {
        this.snackBar.open('No se pudo actualizar el servicio', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  /** Primera carga: arma la lista con lo que los empleados ya tienen escrito. */
  seed() {
    this.saving.set(true);
    this.servicesSvc.seedFromEmployees().subscribe({
      next: (res) => {
        this.employeeSvc.refreshEmployees().subscribe();
        this.snackBar.open(
          `${res.serviciosCreados} servicios creados · ${res.empleadosLimpiados} empleados sin asignar`,
          'OK', { duration: 4000 }
        );
        this.saving.set(false);
      },
      error: () => {
        this.snackBar.open('No se pudo armar la lista', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
