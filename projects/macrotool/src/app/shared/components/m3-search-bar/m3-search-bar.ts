import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

/**
 * Docked search bar de Material 3. El slot proyectado (default) es el
 * elemento de la derecha: normalmente el avatar de usuario con
 * [matMenuTriggerFor], que necesita vivir en el template del consumidor
 * porque el mat-menu que abre tambien vive ahi.
 */
@Component({
  selector: 'flux-m3-search-bar',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './m3-search-bar.html',
  styleUrl: './m3-search-bar.scss'
})
export class M3SearchBar {
  @Input() control!: FormControl<string | null>;
  @Input() placeholder: string = 'Buscar';
}
