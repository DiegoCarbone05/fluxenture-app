import { Component, Input } from '@angular/core';
import { M3StatCard } from '../m3-stat-card/m3-stat-card';
import { StatCardData } from '../../models/StatCardData';

/** Fila desplazable de flux-m3-stat-card, en movil M3. */
@Component({
  selector: 'flux-m3-stats-row',
  standalone: true,
  imports: [M3StatCard],
  templateUrl: './m3-stats-row.html',
  styleUrl: './m3-stats-row.scss'
})
export class M3StatsRow {
  @Input() stats: StatCardData[] = [];
}
