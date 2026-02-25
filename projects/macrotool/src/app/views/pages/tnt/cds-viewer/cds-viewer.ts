import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Cd } from '../../../../shared/models/Cd.model';
import { TrackAndTrace } from '../../../../shared/services/track-and-trace';
import html2Canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Tnt } from '../../../../shared/models/Tnt.model';
import { CdService } from '../../../../core/services/cd-api/cd.service';
import { Employee } from '../../../../shared/models/Employee';
import { EmployeeService } from '../../../../core/services/employees/employee.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Prompt } from '../../../dialogs/prompt/prompt';

@Component({
  selector: 'app-cds-viewer',
  standalone: false,
  templateUrl: './cds-viewer.html',
  styleUrl: './cds-viewer.scss',
})
export class CdsViewer {

  @ViewChild('imprZone', { static: false }) imprZone!: ElementRef;

  cd = signal<Cd | null>(null);
  employee = signal<Employee | null>(null)
  readonly promptDialog = inject(MatDialog);

  displayedColumns: string[] = ['date', 'plant', "historyData", 'status',];
  dataSource = new MatTableDataSource<Tnt>([]);

  async generarPdfDesdeHtml() {
    const data = this.imprZone.nativeElement;

    // 2. Usar html2canvas para convertir el HTML en una imagen (canvas)
    const canvas = await html2Canvas(data, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    return imgData;
  }

  constructor(
    private route: ActivatedRoute,
    private trackAndTrace: TrackAndTrace,
    private router: Router,
    private cdService: CdService,
    private employeeSvc: EmployeeService
  ) {
    this.route.params.subscribe((params) => {

      //Obtiene el Numero de seguimiento desde el params url
      const trackingNumber = params['id'];
      //Obtiene la CD del numero de seguimiento
      const cd = this.cdService.getLocalCdByTrackingNumber(Number(trackingNumber))

      //Si el cdNumber existe y existe la CD, se cargan a los signals
      if (trackingNumber && cd) {
        this.cd.set(cd)

        //Se obtiene el empleado asociado
        const employee = this.employeeSvc.getLocalEmployeeById(cd?.employeeId)
        //Si existe, se carga
        if (employee) this.employee.set(employee)
      }

      this.trackAndTrace.trackPackage(trackingNumber as string).then((res) => {
        const tnt: Tnt[] = res as unknown as Tnt[];
        this.loadTracking(tnt)
      })
    });
  }

  ngOnInit() {
  }

  async exportPDF() {

    const fileId = this.cd()?.fileId;
    const imgData = await this.generarPdfDesdeHtml();

    if (fileId && imgData) {
      this.promptDialog.open(Prompt, {
        data: {
          title: 'Exportar PDF',
          desc: 'La carta de documento con el seguimiento adjuntado sera cargada al sistema, ¿estás seguro de querer continuar?',
        }
      }).afterClosed().subscribe((result) => {
        if (result) this.cdService.exportCd(imgData, fileId).subscribe();
      });
    }
  }

  loadTracking(tnt: Tnt[]) {
    const currentCd = this.cd()!;
    if (currentCd.tnt !== tnt) {
      currentCd.tnt = tnt
      this.cdService.putCd(currentCd).subscribe()
      this.cd.set(currentCd)
      this.dataSource.data = currentCd.tnt
    }


  }

  copyDeliveryDate() {

    // const date = this.trackAndTrace.getLastTntResult(this.trackAndTraceResult() || '').date;
    // navigator.clipboard.writeText(date.split(' ')[0]);
    alert('Fecha de entrega copiada al portapapeles');
  }

  goBack() {
    this.router.navigate(['/main', 'tnt']);
  }


}
