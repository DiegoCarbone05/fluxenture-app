import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Boton pill del rediseño v3 (chip de usuario, boton primario, orden, exportar).
 * Selector de atributo, igual que `button[mat-button]`: mantiene el <button>
 * nativo del consumidor y solo agrega icono + clase de variante.
 *
 * Uso: <button fluxPillBtn variant="primary" icon="add">Nuevo empleado</button>
 */
@Component({
  selector: 'button[fluxPillBtn]',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './pill-button.html',
  styleUrl: './pill-button.scss',
  host: {
    '[class.neutral]': 'variant === "neutral"',
    '[class.primary]': 'variant === "primary"',
    '[class.accent]': 'variant === "accent"',
  }
})
export class PillButton {
  @Input() variant: 'neutral' | 'primary' | 'accent' = 'neutral';
  @Input() icon?: string;
}
