import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule, AsyncPipe } from '@angular/common';
import { CdService } from '../../../core/services/api/cd-api/cd.service';
import { Employee } from '../../../shared/models/Employee';
import { User } from '../../../shared/models/User';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Cd } from '../../../shared/models/Cd.model';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { SelectDocDialog } from '../select-doc-dialog/select-doc-dialog';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';

@Component({
  selector: 'app-add-pdf',
  standalone: true,
  imports: [
    CommonModule, AsyncPipe, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule,
    MatSnackBarModule,
  ],
  templateUrl: './add-pdf.html',
  styleUrl: './add-pdf.scss',
})
export class AddPdf {
  readonly dialogRef = inject(MatDialogRef<AddPdf>);
  /** O bien un Cd completo (edicion, viene con id), o { presetDoc: Doc } (alta nueva con documento ya elegido). */
  readonly data = inject<any>(MAT_DIALOG_DATA, { optional: true });

  form = new FormGroup({
    cdEmployee: new FormControl('', Validators.required),
    cdNumber: new FormControl('', Validators.required),
    obs: new FormControl('', Validators.required),
    emissionDate: new FormControl('', Validators.required),
  });
  pdfPath = signal<string>('');

  constructor(
    private cdService: CdService,
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) { }

  filteredOptions!: Observable<EmployeeDTO[]>;
  employeeSelected!: EmployeeDTO | null;
  pdId = signal<string>('');
  selectedDoc = signal<Doc | null>(null);


  ngOnInit() {
    if (this.data?.id) {
      // Editando un CD existente (this.data es un Cd completo)
      this.form.patchValue({
        cdEmployee: this.data.employeeId,
        cdNumber: String(this.data.trackingNumber),
        obs: this.data.obs,
        emissionDate: this.data.emissionDate,
      });
      this.pdId.set(this.data.fileId);
      this.pdfPath.set('Archivo existente'); // Or you can try to fetch the file name if needed
    } else if (this.data?.presetDoc) {
      // Alta nueva con el documento ya elegido (ej: "Crear CD" desde Documentos)
      const doc: Doc = this.data.presetDoc;
      this.selectedDoc.set(doc);
      this.pdfPath.set(doc.description || 'Documento seleccionado');
      this.pdId.set(doc.driveFileId);
      this.form.patchValue({ cdEmployee: doc.employeeId });
    }

    this.filteredOptions = (this.form.get('cdEmployee')?.valueChanges as Observable<string | number>).pipe(
      startWith(''),
      map((value) => {
        const employees = this.employeeService.getEmployeesSignal()();
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return employees;
        }
        const search = typeof value === 'string' ? value : this.displayFn(value);
        return employees.filter((employee) => employee.name.toLowerCase().includes(search.toLowerCase()));
      }),
    );
  }


  displayFn = (employeeOrId: Employee | string | number): string => {
    if (employeeOrId == null || employeeOrId === '') return '';
    if (typeof employeeOrId === 'object' && 'name' in employeeOrId) {
      return employeeOrId.name;
    }
    const employees = this.employeeService.getEmployeesSignal()();
    const found = employees.find((e: any) => e.id === employeeOrId || String(e.employeeID) === String(employeeOrId));
    this.employeeSelected = found ?? null;
    return found ? found.name : '';
  };


  onDatePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const parsedDate = this.parseDate(pastedText);

    if (parsedDate) {
      this.form.patchValue({ emissionDate: parsedDate });
    }
  }

  parseDate(dateString: string): string | null {
    if (!dateString) return null;

    // Remove extra whitespace
    const cleaned = dateString.trim();

    // Try different date formats
    // Format: DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match1 = cleaned.match(ddmmyyyy);
    if (match1) {
      const day = match1[1].padStart(2, '0');
      const month = match1[2].padStart(2, '0');
      const year = match1[3];
      return `${year}-${month}-${day}`;
    }

    // Format: YYYY/MM/DD or YYYY-MM-DD
    const yyyymmdd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const match2 = cleaned.match(yyyymmdd);
    if (match2) {
      const year = match2[1];
      const month = match2[2].padStart(2, '0');
      const day = match2[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Format: DD.MM.YYYY
    const ddmmyyyyDot = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const match3 = cleaned.match(ddmmyyyyDot);
    if (match3) {
      const day = match3[1].padStart(2, '0');
      const month = match3[2].padStart(2, '0');
      const year = match3[3];
      return `${year}-${month}-${day}`;
    }

    // Already in YYYY-MM-DD format
    const isoFormat = /^\d{4}-\d{2}-\d{2}$/;
    if (cleaned.match(isoFormat)) {
      return cleaned;
    }

    // Try to parse as Date object (handles various formats)
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  addPDF() {
    const employeeId = this.form.value.cdEmployee;
    if (!employeeId || !this.employeeSelected) {
      this.snackBar.open('Seleccione un empleado antes de adjuntar la carta', 'OK', { duration: 2500 });
      return;
    }

    const ref = this.dialog.open(SelectDocDialog, {
      disableClose: true,
      data: {
        employeeId,
        employee: this.employeeSelected,
        filterType: EDocType.CD,
        defaultUploadType: EDocType.CD,
      }
    });

    ref.afterClosed().subscribe((doc: Doc | undefined) => {
      if (!doc) return;
      this.selectedDoc.set(doc);
      this.pdfPath.set(doc.description || 'Documento seleccionado');
      this.pdId.set(doc.driveFileId);
    });
  }

  removePDF() {
    this.pdfPath.set('');
    this.pdId.set('');
    this.selectedDoc.set(null);
  }

  async saveCd() {
    const input = this.form.value

    if (this.data?.id) {
      // Editing existing CD
      this.data.trackingNumber = Number(input.cdNumber);
      this.data.emissionDate = input.emissionDate || '';
      this.data.employeeId = input.cdEmployee || '';
      this.data.fileId = this.pdId() || this.data.fileId;
      // Solo se pisa docId si se selecciono un doc nuevo en esta sesion; si no, se preserva el que tenia.
      this.data.docId = this.selectedDoc()?.id || this.data.docId;
      this.data.obs = input.obs || '';

      this.cdService.putCd(this.data).subscribe({
        next: () => this.closeDialog(),
        error: (err) => console.error('Error updating CD:', err),
      });
    } else {
      // Creating new CD
      const cd = new Cd(
        Number(input.cdNumber),
        input.emissionDate || '',
        input.cdEmployee || '',
        this.pdId(),
        input.obs || '',
        false
      )
      cd.docId = this.selectedDoc()?.id;

      this.cdService.saveCd(cd).subscribe({
        next: () => this.closeDialog(),
        error: (err) => console.error('Error saving CD:', err),
      });
    }
  }


  closeDialog() {
    this.dialogRef.close();
  }
}
