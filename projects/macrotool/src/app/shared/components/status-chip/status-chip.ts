import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Chip de estado binario (Operativo/Inactivo, Justificada/Sin justificar).
 * Mismos dos colores semanticos en todo el rediseño: verde `#d4edbc`/`#11734b`
 * para el caso positivo, rojo `#ffcfc9`/`#b10202` para el negativo.
 */
@Component({
  selector: 'flux-status-chip',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './status-chip.html',
  styleUrl: './status-chip.scss',
  host: {
    '[class.operative]': 'active',
    '[class.inactive]': '!active',
  }
})
export class StatusChip {
  @Input() active: boolean = false;
  @Input() activeLabel: string = 'Activo';
  @Input() inactiveLabel: string = 'Inactivo';
  @Input() activeIcon: string = 'check';
  @Input() inactiveIcon: string = 'close';
}
