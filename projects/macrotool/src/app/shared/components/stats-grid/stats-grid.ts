import { Component, Input } from '@angular/core';
import { StatCard } from '../stat-card/stat-card';
import { StatCardData } from '../../models/StatCardData';

/** Grilla de 4 columnas de flux-stat-card, en escritorio. */
@Component({
  selector: 'flux-stats-grid',
  standalone: true,
  imports: [StatCard],
  templateUrl: './stats-grid.html',
  styleUrl: './stats-grid.scss'
})
export class StatsGrid {
  @Input() stats: StatCardData[] = [];
}
