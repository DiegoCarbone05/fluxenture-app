import { Component, computed, inject, ViewChild, effect, signal, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { AddPdf } from '../../dialogs/add-pdf/add-pdf';
import { Cd } from '../../../shared/models/Cd.model';
import { TrackAndTrace } from '../../../shared/services/track-and-trace';
import { Router } from '@angular/router';
import { CdService } from '../../../core/services/api/cd-api/cd.service';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Prompt } from '../../dialogs/prompt/prompt';
import { StorageService } from '../../../core/services/api/storage/storage.service';
import { AppService } from '../../../core/services/app.service';
import { MatSidenav } from '@angular/material/sidenav';
import { ViewsService } from '../../views.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-tnt',
  standalone: false,
  templateUrl: './tnt.html',
  styleUrl: './tnt.scss'
})
export class Tnt implements AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['name', 'follow_number', 'emission_date', 'obs', 'last_status', 'actions'];
  dataSource = new MatTableDataSource<Cd>([]);
  isMobile = computed(() => this.viewsSvc.getIsMobile());
  isElectron = computed(() => this.appService.isElectron());
  cdsSignal = computed(() => this.cdService.getCdsSignal());
  sortedCds = computed(() => [...this.cdsSignal()].sort((a, b) =>
    new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime()
  ));

  /** Cached status for each tracking number to avoid repeated API calls in template */
  private statusMap = signal<Map<string, string>>(new Map());
  readonly addPdfDialog = inject(MatDialog);
  readonly promptDialog = inject(MatDialog);

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      if (property === 'emission_date') {
        return new Date(item.emissionDate).getTime();
      }
      const value = (item as unknown as Record<string, string | number>)[property];
      return value ?? '';
    };
  }

  constructor(
    private trackAndTrace: TrackAndTrace,
    private router: Router,
    private cdService: CdService,
    private employeeService: EmployeeService,
    private storageService: StorageService,
    private appService: AppService,
    private viewsSvc: ViewsService,
    breakpointObserver: BreakpointObserver
  ) {

    effect(() => {
      const cds = this.cdsSignal();
      this.dataSource.data = [...cds].sort((a, b) =>
        new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime()
      );
    });


    breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet])
      .subscribe(result => {
        if (result.matches) {
          // En móvil solo mostramos lo esencial

          this.displayedColumns = ['name', 'follow_number', 'last_status', 'actions'];
        } else {
          // En escritorio mostramos todo
          this.displayedColumns = ['name', 'follow_number', 'emission_date', 'obs', 'last_status', 'actions'];
        }
      });

  }


  openCdsViewer(element: Cd) {
    console.log("cornudo");

    this.router.navigate(['/main', "app-pages", 'tnt', 'cds-viewer', element.trackingNumber]);
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

    const employee = this.employeeService.getLocalEmployeeById(employeeId);
    return employee?.name || 'Empleado no encontrado';
  }

  getLastStatus(trackingNumber: string) {

    this.trackAndTrace.trackPackage(trackingNumber).then((res) => {
      console.log(res);

    })

    return this.statusMap().get(String(trackingNumber)) ?? 'Cargando...';
  }

  async loadPDF() {
    this.addPdfDialog.open(AddPdf, {
      disableClose: true,
      panelClass: 'custom-flex-dialog'
    });
  }

  editCd(cd: Cd) {
    this.addPdfDialog.open(AddPdf, {
      data: cd,
      panelClass: 'custom-flex-dialog'

    });
  }



}
