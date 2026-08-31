import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StatCardData } from '../../models/StatCardData';

/** Una de las tarjetas de metrica de la fila desplazable, en movil M3. */
@Component({
  selector: 'flux-m3-stat-card',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './m3-stat-card.html',
  styleUrl: './m3-stat-card.scss'
})
export class M3StatCard {
  @Input() stat!: StatCardData;
}
