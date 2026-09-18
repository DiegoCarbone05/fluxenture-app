import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime } from 'rxjs';
import { Doc } from '../../../shared/models/Doc';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { EmployeeDTO } from '../../../shared/models/EmployeeDTO';
import { DocTypePipe } from '../../../shared/pipes/doc-type-pipe';
import { AddDocDialog } from '../add-doc-dialog/add-doc-dialog';

export interface SelectDocDialogData {
  employeeId: string;
  employee?: EmployeeDTO;
  /** Si se pasa, la lista de docs existentes se restringe a este tipo (ej: EDocType.CD para TNT). */
  filterType?: string;
  /** Tipo sugerido al subir un doc nuevo desde aca (no filtra la lista de existentes). */
  defaultUploadType?: string;
}

@Component({
  selector: 'app-select-doc-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    DocTypePipe,
  ],
  templateUrl: './select-doc-dialog.html',
  styleUrl: './select-doc-dialog.scss'
})
export class SelectDocDialog implements OnInit {
  readonly dialogRef = inject(MatDialogRef<SelectDocDialog>);
  private readonly dialog = inject(MatDialog);
  private readonly docsService = inject(DocsService);
  readonly data = inject<SelectDocDialogData>(MAT_DIALOG_DATA);

  loading = signal(true);
  docs = signal<Doc[]>([]);
  searchControl = new FormControl('');
  private searchTerm = signal('');

  filteredDocs = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    let list = this.docs();
    if (this.data.filterType) list = list.filter(d => d.type === this.data.filterType);
    if (!term) return list;
    return list.filter(d =>
      (d.description ?? '').toLowerCase().includes(term) ||
      (d.type ?? '').toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.docsService.getDocsByEmployeeId(this.data.employeeId).subscribe({
      next: (docs) => {
        this.docs.set(docs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.searchControl.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      this.searchTerm.set(value ?? '');
    });
  }

  selectDoc(doc: Doc): void {
    this.dialogRef.close(doc);
  }

  uploadNew(): void {
    const ref = this.dialog.open(AddDocDialog, {
      disableClose: true,
      data: {
        employeeId: this.data.employeeId,
        employee: this.data.employee,
        type: this.data.defaultUploadType,
      }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.dialogRef.close(result);
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
