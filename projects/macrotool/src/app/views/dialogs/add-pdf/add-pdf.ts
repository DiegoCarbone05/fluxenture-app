import { Component, inject, signal } from '@angular/core';
import { Electron } from '../../../shared/services/electron';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TrackAndTrace } from '../../../shared/services/track-and-trace';
import { CdService } from '../../../core/services/cd-api/cd.service';
import { Employee } from '../../../shared/models/Employee';
import { User } from '../../../shared/models/User';
import { map, Observable, startWith } from 'rxjs';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { Cd } from '../../../shared/models/Cd.model';
import { STORAGE_PATH_CONSTANT } from '../../../shared/constants/storage-path.constant';
import { StorageService } from '../../../core/services/storage/storage.service';

@Component({
  selector: 'app-add-pdf',
  standalone: false,
  templateUrl: './add-pdf.html',
  styleUrl: './add-pdf.scss',
})
export class AddPdf {
  readonly dialogRef = inject(MatDialogRef<AddPdf>);

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
    private storageService: StorageService
  ) { }

  options: Employee[] = [];
  filteredOptions!: Observable<Employee[]>;
  employeeSelected!: Employee;
  pdId = signal<string>('');


  ngOnInit() {

    this.filteredOptions = (this.form.get('cdEmployee')?.valueChanges as Observable<string | number>).pipe(
      startWith(''),
      map((value) => {
        const employees = this.employeeService.getEmployees();
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
    const employees = this.employeeService.getEmployees();
    const found = employees.find((e) => e.id === employeeOrId || String(e.employeeID) === String(employeeOrId));
    this.employeeSelected = found ?? new Employee(); // if not found, create a new employee
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

  async addPDF() {
    const explorer = document.createElement('input');
    explorer.type = 'file';
    explorer.accept = 'application/pdf';

    const fileName = `[${this.employeeSelected.name}] ${this.form.value.cdNumber}_${this.form.value.emissionDate}_${this.form.value.obs}`;

    explorer.click();
    explorer.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.storageService.uploadFile(file, STORAGE_PATH_CONSTANT.ROOT_CD + "/" + new Date().getFullYear(), fileName).subscribe((result: any) => {
          this.pdfPath.set(file.name); // result is the path of the file
          this.pdId.set(result.response);
        });
      }
    };
  }

  async removePDF() {
    this.pdfPath.set('');
  }

  async saveCd() {
    const input = this.form.value
    const cd = new Cd(
      Number(input.cdNumber),
      input.emissionDate || '',
      input.cdEmployee || '',
      this.pdId(),
      input.obs || '',
      false
    )

    this.cdService.saveCd(cd).subscribe({
      next: () => this.closeDialog(),
      error: (err) => console.error('Error saving CD:', err),
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
