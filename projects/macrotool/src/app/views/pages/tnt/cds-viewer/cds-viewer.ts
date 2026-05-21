import { Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Cd } from '../../../../shared/models/Cd.model';
import { TrackAndTrace } from '../../../../shared/services/track-and-trace';
import html2Canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Tnt } from '../../../../shared/models/Tnt.model';
import { CdService } from '../../../../core/services/api/cd-api/cd.service';
import { Employee } from '../../../../shared/models/Employee';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { Prompt } from '../../../dialogs/prompt/prompt';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { AppService } from '../../../../core/services/app.service';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';

@Component({
  selector: 'app-cds-viewer',
  standalone: false,
  templateUrl: './cds-viewer.html',
  styleUrl: './cds-viewer.scss',
})
export class CdsViewer {

  @ViewChild('imprZone', { static: false }) imprZone!: ElementRef;

  cd = signal<Cd | null>(null);
  employee = signal<EmployeeDTO | null>(null)
  isElectron = computed(() => this.appService.isElectron());

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

  changeTrackingCompleted(event: any) {
    if (this.cd()) {
      this.cd()!.trackingCompleted = event.checked;
      this.cdService.putCd(this.cd()!).subscribe();
    }
  }

  constructor(
    private route: ActivatedRoute,
    private trackAndTrace: TrackAndTrace,
    private router: Router,
    private cdService: CdService,
    private employeeSvc: EmployeeService,
    private storageService: StorageService,
    private appService: AppService
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

      if (this.isElectron()) {
        if ((this.cd() && this.cd()?.trackingCompleted)) {
          this.loadTrackingFromLocal(this.cd()!.tnt)
        } else {
          console.log("trackingCompleted false");
          this.trackAndTrace.trackPackage(trackingNumber as string).then((res) => {
            const tnt: Tnt[] = res as unknown as Tnt[];
            this.loadTracking(tnt)
          })
        }
      } else {
        this.loadTrackingFromLocal(this.cd()!.tnt)
      }



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


  downloadFile() {
    const fileId = this.cd()?.fileId;
    if (fileId) {
      this.storageService.downloadFile(fileId).subscribe((res) => {
        const blob = new Blob([res], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.cd()?.trackingNumber} - ${this.employee()?.name}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  loadTrackingFromLocal(tnt: Tnt[]) {
    this.dataSource.data = tnt
    console.log(tnt);
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
    this.router.navigate(['/main', 'app-pages', 'tnt']);
  }


}
