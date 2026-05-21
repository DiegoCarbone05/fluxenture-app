import { Component, inject, OnInit, ViewChild, signal, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
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
  standalone: false,
  templateUrl: './docs.html',
  styleUrl: './docs.scss'
})
export class Docs implements OnInit {

  readonly dialog = inject(MatDialog);

  months = MONTHS
  years = YEARS;
  currentDate = computed(() => this.appSvc.dateOfData());

  @ViewChild(MatSort) set sort(matSort: MatSort) {
    if (matSort) {
      this.dataSource.sort = matSort;
      this.dataSource.sortingDataAccessor = (item, property) => {
        if (property === 'uploadDate') {
          return new Date(item.uploadDate).getTime() || 0;
        }
        return (item as any)[property] ?? '';
      };
    }
  }

  displayedColumns = ['employee', 'type', 'uploadDate', 'description', 'user', 'actions'];
  dataSource = new MatTableDataSource<Doc>([]);
  isLoading = signal(true);

  constructor(
    private docsService: DocsService,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private storageSvc: StorageService,
    private appSvc: AppService,
    private utilsSvc: UtilsService
  ) {
  }

  ngOnInit(): void {
    this.loadDocs();
  }

  editDoc(docId: string) {
    const dialogRef = this.dialog.open(AddDocDialog, {
      data: {
        editDocId: docId
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadDocs();
    });
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
            this.loadDocs();
          }
        }
      }
    );
  }

  /**
   * Carga los documentos desde la API
   */
  loadDocs(): void {
    this.isLoading.set(true);
    this.docsService.getDocs().subscribe({
      next: (docs) => {
        docs = docs.filter(doc => {
          const docDate = new Date(doc.uploadDate);
          return docDate.getMonth() + 1 === this.currentDate().month && docDate.getFullYear() === this.currentDate().year;
        });
        this.dataSource.data = docs;
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando docs', err);
        this.isLoading.set(false);
      }
    });
  }

  openFile(docId: string) {
    this.utilsSvc.openFile(docId);
  }

  /**
   * Obtiene los empleados por ID
   */
  getEmployeeName(employeeId: string): string {
    return this.employeeService.getLocalEmployeeById(employeeId)?.name || '';
  }

  /**
   * Abre el diálogo para agregar un documento
   */
  openDialog() {
    const ref = this.dialog.open(AddDocDialog, {
      disableClose: true
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadDocs();
    });
  }

  /**
   * Elimina un documento
   */
  deleteDoc(doc: Doc): void {
    if (!doc.id) return;

    // Abre un diálogo de confirmación
    const dialogRef = this.dialog.open(Prompt, {
      data: {
        title: 'Eliminar documento',
        desc: `¿Está seguro que desea eliminar el documento?`
      }
    });

    // Si se confirma la eliminación, se elimina el documento
    dialogRef.afterClosed().subscribe(result => {
      if (result) { //Verifica que el resultado sea true
        if (!doc.id) return; //Verifica que el documento tenga un ID
        this.docsService.deleteDoc(doc.id).subscribe({
          next: () => { //Si se elimina el documento, se elimina el archivo
            this.storageSvc.deleteFile(doc.driveFileId).subscribe({
              next: () => { //Si se elimina el archivo, se recarga la lista de documentos
                this.loadDocs()
                this.snackBar.open('Documento eliminado correctamente', 'OK', { duration: 2000 });
              },
              error: (err) => { //Si hay un error al eliminar el archivo, se muestra un mensaje de error
                console.error('Error borrando archivo', err)
                this.snackBar.open('Error borrando archivo', 'OK', { duration: 2000 });
              }
            });
          },
          error: (err) => { //Si hay un error al eliminar el documento, se muestra un mensaje de error
            console.error('Error borrando doc', err)
            this.snackBar.open('Error borrando documento', 'OK', { duration: 2000 });
          }
        });
      }
    });
  }

  /**
   * Formatea la fecha
   */
  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR');
  }
}