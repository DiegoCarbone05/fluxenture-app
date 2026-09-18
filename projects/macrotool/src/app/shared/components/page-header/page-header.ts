import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UserAccountDialog } from '../../../views/dialogs/user-account-dialog/user-account-dialog';

/**
 * Encabezado de pagina de escritorio del rediseño v3: titulo + subtitulo a
 * la izquierda, acciones (botones fluxPillBtn) proyectadas a la derecha, y el
 * boton de cuenta de Servaltek al final.
 * Reemplaza a flux-toolbar en escritorio para Empleados y Ausencias.
 */
@Component({
  selector: 'flux-page-header',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatTooltipModule,
    MatProgressSpinnerModule, MatSnackBarModule, UserAccountDialog,
  ],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss'
})
export class PageHeader {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() compact: boolean = false;
  /** Muestra una flecha "volver" antes del titulo — para paginas de detalle (emp-view, absent-view). */
  @Input() showBack: boolean = false;
  /** Override opcional de la navegacion "volver" (ej. cds-viewer, que siempre vuelve al listado de T&T en vez del historial del navegador). Sin listeners, cae en Location.back(). */
  @Output() backClick = new EventEmitter<void>();

  private readonly location = inject(Location);

  goBack(): void {
    if (this.backClick.observed) {
      this.backClick.emit();
      return;
    }
    this.location.back();
  }
}
