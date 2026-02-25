import { Component, computed, inject, ViewChild, effect, signal } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { AddPdf } from '../../dialogs/add-pdf/add-pdf';
import { Cd } from '../../../shared/models/Cd.model';
import { TrackAndTrace } from '../../../shared/services/track-and-trace';
import { Router } from '@angular/router';
import { CdService } from '../../../core/services/cd-api/cd.service';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { Prompt } from '../../dialogs/prompt/prompt';
import { StorageService } from '../../../core/services/storage/storage.service';

@Component({
  selector: 'app-tnt',
  standalone: false,
  templateUrl: './tnt.html',
  styleUrl: './tnt.scss'
})
export class Tnt {
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['name', 'follow_number', 'emission_date', 'obs', 'last_status', 'actions'];
  dataSource = new MatTableDataSource<Cd>([]);

  cdsSignal = computed(() => this.cdService.getCdsSignal());

  /** Cached status for each tracking number to avoid repeated API calls in template */
  private statusMap = signal<Map<string, string>>(new Map());

  readonly addPdfDialog = inject(MatDialog);
  readonly promptDialog = inject(MatDialog);

  constructor(
    private trackAndTrace: TrackAndTrace,
    private router: Router,
    private cdService: CdService,
    private employeeService: EmployeeService,
    private storageService: StorageService) {

    effect(() => {
      const cds = this.cdsSignal();
      this.dataSource.data = cds.reverse();
    });
  }


  openCdsViewer(element: Cd) {
    this.router.navigate(['/main', 'cds-viewer', element.trackingNumber]);
  }

  deleteCd(cd: Cd) {
    this.promptDialog.open(Prompt, {
      data: {
        title: 'Eliminar CD',
        desc: '¿Estás seguro de querer eliminar este CD?',
      }
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.cdService.deleteCd(cd.id).subscribe({
          next: () => {
            this.cdService.refreshCds().subscribe();
            this.storageService.deleteFile(cd.fileId).subscribe();
          },
          error: (error) => {
            console.error(error);
          }
        });
      }
    });
  }

  returnEmployeeName(employeeId: string) {
    const employee = this.employeeService.getEmployees().find((employee) => employee.id === employeeId);
    if (employee) {
      return employee.name;
    } else {
      return 'Empleado no encontrado';
    }
  }

  getLastStatus(trackingNumber: string) {

    this.trackAndTrace.trackPackage(trackingNumber).then((res) => {
      console.log(res);

    })

    return this.statusMap().get(String(trackingNumber)) ?? 'Cargando...';
  }

  async loadPDF() {
    this.addPdfDialog.open(AddPdf);
  }



}
