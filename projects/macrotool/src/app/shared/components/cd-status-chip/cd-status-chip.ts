import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { ETrackingStatus } from '../../models/Tnt.model';

@Component({
  selector: 'app-cd-status-chip',
  standalone: false,
  templateUrl: './cd-status-chip.html',
  styleUrl: './cd-status-chip.scss'
})
export class CdStatusChip implements OnChanges {
  @Input() status: any;

  successStatus = [ETrackingStatus.ENTREGADO, ETrackingStatus.ENTREGA_EN_SUCURSAL];
  errorStatus = [ETrackingStatus.DOMICILIO_CERRADO_1, ETrackingStatus.DOMICILIO_CERRADO_2, ETrackingStatus.DEVUELTO_AL_REMITENTE, ETrackingStatus.PLAZO_VENCIDO_NO_RECLAMADO];
  warningStatus = [ETrackingStatus.EN_ESPERA_EN_SUCURSAL];
  statusClass = signal<string>('');

  ngOnChanges(changes: SimpleChanges): void {
    this.statusClass.set(this.getStatusClass(changes['status'].currentValue));
  }


  getStatusClass(status: ETrackingStatus | string) {
    if (this.successStatus.includes(status as ETrackingStatus)) {
      return 'success';
    } else if (this.errorStatus.includes(status as ETrackingStatus)) {
      return 'error';
    } else if (this.warningStatus.includes(status as ETrackingStatus)) {
      return 'warning';
    } else if (status === 'No hay status') {
      return 'no-status-pending';
    } else {
      return 'warning';
    }
  }
}