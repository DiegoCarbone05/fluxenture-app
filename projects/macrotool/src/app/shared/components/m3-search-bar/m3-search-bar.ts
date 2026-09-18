import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UserAccountDialog } from '../../../views/dialogs/user-account-dialog/user-account-dialog';

/**
 * Docked search bar de Material 3. Cierra a la derecha con el boton de cuenta
 * de Servaltek, que antes tenia que armar cada pagina movil (avatar proyectado
 * + su propio mat-menu de "Mi cuenta / Cerrar sesion", repetido identico en
 * cuatro templates).
 *
 * El slot proyectado (default) queda para acciones extra a la izquierda de ese
 * boton.
 */
@Component({
  selector: 'flux-m3-search-bar',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, UserAccountDialog],
  templateUrl: './m3-search-bar.html',
  styleUrl: './m3-search-bar.scss'
})
export class M3SearchBar {
  @Input() control!: FormControl<string | null>;
  @Input() placeholder: string = 'Buscar';
}
