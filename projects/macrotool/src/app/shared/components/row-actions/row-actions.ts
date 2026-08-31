import { Component } from '@angular/core';

/**
 * Fila de acciones de tabla (ver/editar/eliminar), alineada a la derecha.
 * Cascaron para flux-icon-btn: sin el `display: flex` del host, cada boton
 * (que es flex por dentro) queda a ancho completo y se apila.
 */
@Component({
  selector: 'flux-row-actions',
  standalone: true,
  templateUrl: './row-actions.html',
  styleUrl: './row-actions.scss'
})
export class RowActions { }
