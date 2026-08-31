import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Three-line list item de Material 3: avatar, encabezado, hasta dos lineas
 * de soporte. El contenido proyectado (default slot) es el elemento final
 * de la fila: un chip de estado, acciones, o un total.
 */
@Component({
  selector: 'flux-m3-list-item',
  standalone: true,
  templateUrl: './m3-list-item.html',
  styleUrl: './m3-list-item.scss',
  host: {
    '[class.clickable]': 'clickable',
    '(click)': 'clickable && itemClick.emit()',
  }
})
export class M3ListItem {
  @Input() initials: string = '';
  @Input() headline: string = '';
  @Input() support: string[] = [];
  @Input() clickable: boolean = true;
  @Output() itemClick = new EventEmitter<void>();
}
