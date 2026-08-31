import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StatCardData } from '../../models/StatCardData';

/** Una de las 4 tarjetas de metrica del encabezado, en escritorio. */
@Component({
  selector: 'flux-stat-card',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss'
})
export class StatCard {
  @Input() stat!: StatCardData;
}
