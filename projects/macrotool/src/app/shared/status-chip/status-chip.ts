import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatIconModule],
  templateUrl: './status-chip.html',
  styleUrl: './status-chip.scss'
})
export class StatusChip {
  @Input() status: any = 'N/A';
}
