import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DocTypePipe } from '../../../shared/pipes/doc-type-pipe';
import { Toolbar } from '../../../shared/components/toolbar/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddDocDialog } from '../../dialogs/add-doc-dialog/add-doc-dialog';
import { DocsService } from '../../../core/services/api/docs/docs.service';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Doc } from '../../../shared/models/Doc';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { Prompt } from '../../dialogs/prompt/prompt';
import { DatepickerDialog } from '../../dialogs/datepicker-dialog/datepicker-dialog';
import { MONTHS, YEARS } from '../../../shared/constants/general-constant';
import { AppService } from '../../../core/services/app.service';
import { UtilsService } from '../../../core/services/utils.service';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule,
    DocTypePipe, Toolbar,
  ],
  templateUrl: './docs.html',
  styleUrl: './docs.scss'
})
export class Docs implements OnInit {

  readonly dialog = inject(MatDialog);

  months = MONTHS;
  years = YEARS;
  currentDate = computed(() => this.appSvc.dateOfData());

  docs = signal<Doc[]>([]);
  isLoading = signal(true);

  constructor(
    private docsService: DocsService,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private storageSvc: StorageService,
    private appSvc: AppService,
    private utilsSvc: UtilsService
  ) { }

  ngOnInit(): void {
    this.loadDocs();
  }

  loadDocs(): void {
    this.isLoading.set(true);
    this.docsService.getDocs().subscribe({
      next: (allDocs) => {
        const filtered = allDocs
          .filter(doc => {
            const d = new Date(doc.uploadDate);
            return d.getMonth() + 1 === this.currentDate().month
              && d.getFullYear() === this.currentDate().year;
          })
          .sort((a, b) =>
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          );
        this.docs.set(filtered);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando docs', err);
        this.isLoading.set(false);
      }
    });
  }

  editDoc(docId: string | undefined): void {
    if (!docId) return;
    const dialogRef = this.dialog.open(AddDocDialog, {
      data: { editDocId: docId },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadDocs();
    });
  }

  openDatePickerDialog(): void {
    const dialogRef = this.dialog.open(DatepickerDialog, {
      disableClose: true,
      data: this.currentDate()
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.appSvc.setDateOfData(result);
        this.loadDocs();
      }
    });
  }

  openFile(docId: string): void {
    this.utilsSvc.openFile(docId);
  }

  getEmployeeName(employeeId: string): string {
    return this.employeeService.getLocalEmployeeById(employeeId)?.name || '—';
  }

  openDialog(): void {
    const ref = this.dialog.open(AddDocDialog, { disableClose: true });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadDocs();
    });
  }

  deleteDoc(doc: Doc): void {
    if (!doc.id) return;
    const dialogRef = this.dialog.open(Prompt, {
      data: {
        title: 'Eliminar documento',
        desc: '¿Está seguro que desea eliminar el documento?'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      if (!doc.id) return;
      this.docsService.deleteDoc(doc.id).subscribe({
        next: () => {
          this.storageSvc.deleteFile(doc.driveFileId).subscribe({
            next: () => {
              this.loadDocs();
              this.snackBar.open('Documento eliminado correctamente', 'OK', { duration: 2000 });
            },
            error: (err) => {
              console.error('Error borrando archivo', err);
              this.snackBar.open('Error borrando archivo', 'OK', { duration: 2000 });
            }
          });
        },
        error: (err) => {
          console.error('Error borrando doc', err);
          this.snackBar.open('Error borrando documento', 'OK', { duration: 2000 });
        }
      });
    });
  }

  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-AR');
  }
}
