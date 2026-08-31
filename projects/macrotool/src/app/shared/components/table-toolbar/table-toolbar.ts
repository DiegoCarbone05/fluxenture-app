import { Component } from '@angular/core';

/**
 * Cascaron de la barra de herramientas de tabla: fila flex con un spacer
 * entre lo proyectado en [toolbarStart] (buscador, selects) y [toolbarEnd]
 * (orden, exportar). El contenido de cada lado lo arma cada pagina.
 */
@Component({
  selector: 'flux-table-toolbar',
  standalone: true,
  templateUrl: './table-toolbar.html',
  styleUrl: './table-toolbar.scss'
})
export class TableToolbar { }
