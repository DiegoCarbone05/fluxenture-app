import { Component, Inject, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Observable, forkJoin, map, startWith } from 'rxjs';

import { Doc } from '../../../shared/models/Doc';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';
import { fullNameOf } from '../../../shared/models/Employee';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { TipoDocumentoService } from '../../../core/services/api/tipo-documento/tipo-documento.service';

export interface DocBulkEditDialogData {
  docs: Doc[];
}

/**
 * Edicion en lote de varios documentos seleccionados. Todos los campos arrancan
 * vacios: vacio significa "no tocar ese campo en ningun doc", un valor significa
 * "pisarlo en todos los seleccionados" — no hay forma de "vaciar" un campo en lote
 * (no se pidio), solo de asignarle un valor.
 */
@Component({
  selector: 'app-doc-bulk-edit-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule,
    MatDatepickerModule, MatSnackBarModule,
  ],
  templateUrl: './doc-bulk-edit-dialog.html',
  styleUrl: './doc-bulk-edit-dialog.scss',
  providers: [provideNativeDateAdapter()],
})
export class DocBulkEditDialog {
  private readonly employeeService = inject(EmployeeService);
  private readonly docsService = inject(DocsService);
  private readonly tipoDocumentoService = inject(TipoDocumentoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<DocBulkEditDialog>);

  readonly docs: Doc[];
  readonly count: number;

  readonly docTypes = computed(() => this.tipoDocumentoService.activeTipos());

  applying = signal(false);

  form = new FormGroup({
    employee: new FormControl<EmployeeDTO | string | null>(null),
    employeeId: new FormControl<string | null>(null),
    type: new FormControl<string | null>(null),
    description: new FormControl<string>(''),
    date: new FormControl<Date | null>(null),
  });

  filteredEmployees: Observable<EmployeeDTO[]>;

  constructor(@Inject(MAT_DIALOG_DATA) data: DocBulkEditDialogData) {
    this.docs = data.docs;
    this.count = data.docs.length;

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

  displayFn = (empOrStr: EmployeeDTO | string | null): string => {
    if (!empOrStr) return '';
    if (typeof empOrStr === 'object' && 'name' in empOrStr) return empOrStr.name;
    return '';
  };

  onEmployeeSelected(event: any): void {
    const emp = event.option.value as EmployeeDTO;
    this.form.patchValue({ employeeId: String(emp.employeeId ?? ''), employee: emp as any });
  }

  apply(): void {
    if (this.applying()) return;
    const { employeeId, type, description, date } = this.form.getRawValue();

    if (!employeeId && !type && !description && !date) {
      this.snackBar.open('Elegí al menos un campo para aplicar', 'OK', { duration: 2500 });
      return;
    }

    this.applying.set(true);
    const requests = this.docs.map((doc) => {
      const merged: Doc = { ...doc };
      if (employeeId) merged.employeeId = employeeId;
      if (type) merged.type = type;
      if (description) merged.description = description;
      if (date) merged.uploadDate = date as any;
      return this.docsService.saveDoc(merged);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.applying.set(false);
        this.snackBar.open(`${this.count} documentos actualizados`, 'OK', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error aplicando edicion en lote', err);
        this.applying.set(false);
        this.snackBar.open('Error al aplicar los cambios', 'OK', { duration: 3000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
