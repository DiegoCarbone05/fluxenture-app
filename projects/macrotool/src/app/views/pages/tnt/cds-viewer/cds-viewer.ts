import { afterNextRender, Component, computed, ElementRef, inject, Injector, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PillButton } from '../../../../shared/components/pill-button/pill-button';
import { ActivatedRoute, Router } from '@angular/router';
import { Cd, parseTrackingCode, trackingCodeOf } from '../../../../shared/models/Cd.model';
import html2Canvas from 'html2canvas';
import { Tnt } from '../../../../shared/models/Tnt.model';
import { CdService } from '../../../../core/services/api/cd-api/cd.service';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';
import { fullNameOf } from '../../../../shared/models/Employee';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-cds-viewer',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatSortModule,
    MatIconModule, MatCheckboxModule, PageHeader, PillButton,
  ],
  templateUrl: './cds-viewer.html',
  styleUrl: './cds-viewer.scss',
})
export class CdsViewer {

  @ViewChild('imprZone', { static: false }) imprZone!: ElementRef;

  cd = signal<Cd | null>(null);
  trackingCode = computed(() => trackingCodeOf(this.cd()));
  employee = signal<EmployeeDTO | null>(null)
  employeeName = computed(() => fullNameOf(this.employee()));
  tnts = signal<Tnt[]>([]);
  loadingTracking = signal(false);
  trackingError = signal<string | null>(null);
  savingSnapshot = signal(false);
  downloadingFile = signal(false);

  private readonly injector = inject(Injector);
  displayedColumns: string[] = ['date', 'plant', "historyData", 'status',];

  async generarPdfDesdeHtml() {
    const data = this.imprZone.nativeElement;

    // 2. Usar html2canvas para convertir el HTML en una imagen (canvas)
    const canvas = await html2Canvas(data, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    return imgData;
  }

  changeTrackingCompleted(event: any) {
    const current = this.cd();
    if (!current) return;

    const updated = { ...current, trackingCompleted: event.checked } as Cd;
    this.cd.set(updated);
    this.cdService.putCd(updated).subscribe();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdService: CdService,
    private employeeSvc: EmployeeService,
    private storageService: StorageService,
  ) {
    this.route.params.subscribe((params) => {

      //El param es el codigo completo ("CD123456789"). Los links viejos traen
      //solo el numero: parseTrackingCode devuelve el prefijo por defecto y la
      //busqueda cae en la primera coincidencia, como antes.
      const { product, trackingNumber } = parseTrackingCode(params['id']);
      const hasProduct = /[A-Za-z]/.test(String(params['id'] ?? ''));

      //Obtiene la CD del numero de seguimiento
      const cd = this.cdService.getLocalCdByTrackingNumber(trackingNumber, hasProduct ? product : undefined)

      if (cd) {
        this.loadCd(cd);
        return;
      }

      //Entrada directa por URL (F5): el cache todavia no esta poblado
      this.cdService.refreshCds().subscribe(() => {
        const fetched = this.cdService.getLocalCdByTrackingNumber(trackingNumber, hasProduct ? product : undefined);
        if (fetched) this.loadCd(fetched);
      });
    });
  }

  private loadCd(cd: Cd) {
    this.cd.set(cd)
    //Se muestra lo persistido mientras el backend consulta el seguimiento
    this.tnts.set(cd.tnt ?? [])

    //Se obtiene el empleado asociado
    const employee = this.employeeSvc.getLocalEmployeeById(cd.employeeId)
    if (employee) this.employee.set(employee)

    //Un seguimiento cerrado ya no cambia: se deja el historial persistido
    if (!cd.trackingCompleted) this.refreshTracking();
  }

  /** Pide al backend que scrapee Correo Argentino y persista el resultado en la CD. */
  refreshTracking() {
    const cd = this.cd();
    if (!cd) return;

    const previousTnt = cd.tnt;
    this.loadingTracking.set(true);
    this.trackingError.set(null);

    this.cdService.refreshTracking(cd.id).subscribe({
      next: (updated) => {
        const changed = JSON.stringify(updated.tnt) !== JSON.stringify(previousTnt);
        this.cd.set(updated);
        this.tnts.set(updated.tnt ?? []);
        this.loadingTracking.set(false);

        // Se espera a que Angular termine de pintar la tabla con los datos nuevos
        // antes de sacar la foto que se sube a Drive.
        if (changed) {
          afterNextRender(() => this.syncSnapshotToDrive(), { injector: this.injector });
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error obteniendo el seguimiento:', err);
        this.trackingError.set(this.describeTrackingError(err, cd.id));
        this.loadingTracking.set(false);
      },
    });
  }

  /** Traduce el fallo HTTP a algo accionable en vez de un "no se pudo" genérico. */
  private describeTrackingError(err: HttpErrorResponse, cdId: string): string {
    switch (err.status) {
      case 0:
        return 'No se pudo contactar al servidor.';
      case 404:
        return `El servidor no encontró la CD (id: ${cdId}).`;
      case 502:
        return 'Correo Argentino no responde. Reintentá en unos minutos.';
      default:
        return `El servidor respondió ${err.status}: ${err.error?.message ?? err.message}`;
    }
  }

  /**
   * Sube a Drive una foto del historial de seguimiento tal como se ve ahora,
   * fusionada con la carta original (siempre reemplaza el snapshot anterior,
   * nunca acumula páginas). Se dispara sola cuando cambia el T&T; el botón
   * manual queda como resincronización de emergencia.
   */
  async syncSnapshotToDrive(): Promise<void> {
    const cd = this.cd();
    if (!cd) return;

    this.savingSnapshot.set(true);
    try {
      const imgData = await this.generarPdfDesdeHtml();
      const updated = await firstValueFrom(this.cdService.syncTrackingSnapshot(cd.id, imgData));
      // El backend puede haberle creado a la CD su propio PDF de salida para no pisar la carta
      // original: se adopta el fileId nuevo o la descarga seguiria apuntando al archivo viejo.
      if (updated) this.cd.set(updated);
    } catch (err) {
      console.error('Error subiendo el seguimiento a Drive:', err);
    } finally {
      this.savingSnapshot.set(false);
    }
  }

  async downloadFile() {
    const cd = this.cd();
    if (!cd?.fileId) return;

    this.downloadingFile.set(true);

    // Siempre se sincroniza antes de bajar el archivo: el merge se regenera
    // desde el original inmutable + la foto actual (nunca acumula paginas),
    // asi que resincronizar en cada descarga es seguro y barato, y evita
    // servir una copia vieja si el auto-sync de refreshTracking no llego a correr.
    await this.syncSnapshotToDrive();

    // Se lee despues del sync: si era la primera sincronizacion, la CD estrena fileId propio.
    const fileId = this.cd()?.fileId ?? cd.fileId;

    this.storageService.downloadFile(fileId).subscribe({
      next: (res) => {
        const blob = new Blob([res], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.trackingCode()} - ${this.employeeName()}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloadingFile.set(false);
      },
      error: (err) => {
        console.error('Error descargando el archivo:', err);
        this.downloadingFile.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/main', 'app-pages', 'tnt']);
  }


}
