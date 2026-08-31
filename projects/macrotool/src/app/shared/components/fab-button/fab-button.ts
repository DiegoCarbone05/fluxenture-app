import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * FAB de Material 3: cuadrado con radio 16px, no circulo. `variant="accent"`
 * es la version chica del boton de borradores de Empleados.
 * Selector de atributo: mantiene el <button> nativo, agrega icono + clase.
 */
@Component({
  selector: 'button[fluxFab]',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './fab-button.html',
  styleUrl: './fab-button.scss',
  host: {
    '[class.primary]': 'variant === "primary"',
    '[class.accent]': 'variant === "accent"',
  }
})
export class FabButton {
  @Input() variant: 'primary' | 'accent' = 'primary';
  @Input() icon!: string;
}
