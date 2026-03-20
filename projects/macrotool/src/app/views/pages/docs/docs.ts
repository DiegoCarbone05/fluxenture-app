import { Component, inject, OnInit, ViewChild, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddDocDialog } from '../../dialogs/add-doc-dialog/add-doc-dialog';
import { DocsService } from '../../../core/services/docs/docs.service';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { Doc } from '../../../shared/models/Doc';
import { StorageService } from '../../../core/services/storage/storage.service';
import { Prompt } from '../../dialogs/prompt/prompt';

@Component({
  selector: 'app-docs',
  standalone: false,
  templateUrl: './docs.html',
  styleUrl: './docs.scss'
})
export class Docs implements OnInit {

  readonly dialog = inject(MatDialog);

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

  displayedColumns = ['employee', 'type', 'uploadDate', 'description', 'actions'];
  dataSource = new MatTableDataSource<Doc>([]);
  isLoading = signal(true);

  constructor(
    private docsService: DocsService,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private storageSvc: StorageService
  ) { }

  ngOnInit(): void {
    this.loadDocs();
  }

  /**
   * Carga los documentos desde la API
   */
  loadDocs(): void {
    this.isLoading.set(true);
    this.docsService.getDocs().subscribe({
      next: (docs) => {
        this.dataSource.data = docs;
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando docs', err);
        this.isLoading.set(false);
      }
    });
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