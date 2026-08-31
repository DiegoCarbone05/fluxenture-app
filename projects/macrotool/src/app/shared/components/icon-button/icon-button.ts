import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Boton circular de accion de fila (ver/editar/eliminar). Selector de
 * atributo: mantiene el <button mat-icon-button style="..."> nativo y solo
 * agrega el icono + la clase de variante.
 *
 * Uso: <button fluxIconBtn variant="delete" icon="delete" matTooltip="Eliminar" (click)="..."></button>
 */
@Component({
  selector: 'button[fluxIconBtn]',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  host: {
    '[class.view]': 'variant === "view"',
    '[class.edit]': 'variant === "edit"',
    '[class.delete]': 'variant === "delete"',
  }
})
export class IconButton {
  @Input() variant: 'view' | 'edit' | 'delete' = 'view';
  @Input() icon!: string;
}
