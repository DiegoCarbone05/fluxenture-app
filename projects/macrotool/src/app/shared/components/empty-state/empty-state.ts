import { Component, Input } from '@angular/core';

/**
 * Estado vacio dentro de una tarjeta-tabla o lista M3. `size` controla el
 * ancho de la ilustracion: "desktop" (180px) o "compact" (160px, movil).
 */
@Component({
  selector: 'flux-empty-state',
  standalone: true,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  host: {
    '[class.compact]': 'size === "compact"',
  }
})
export class EmptyState {
  @Input() title: string = 'Sin resultados';
  @Input() text: string = '';
  @Input() image: string = 'assets/pictures/undraw_no-data_ig65.svg';
  @Input() size: 'desktop' | 'compact' = 'desktop';
}
