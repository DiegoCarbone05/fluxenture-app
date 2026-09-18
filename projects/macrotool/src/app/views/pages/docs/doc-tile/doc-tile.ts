import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FluxFileIcon } from '../../../../shared/components/flux-file-icon/flux-file-icon';

/** Fila ya derivada para la grilla — ver Docs#toRow. */
export interface DocGridRow {
  id: string;
  description: string;
  typeId?: string;
  extension?: string;
  blocked: boolean;
}

/**
 * Un tile de la grilla de Documentos. No decide su propia seleccion: emite el click
 * (con los modificadores de teclado) para que la pagina resuelva click/ctrl/shift/marquee
 * en un solo lugar. El host lleva la clase `doc-tile` + `data-doc-id`, que la pagina usa
 * tanto para el testeo de interseccion del marquee como para saber donde no debe arrancar
 * un nuevo marquee (mousedown sobre un tile != mousedown sobre el fondo).
 */
@Component({
  selector: 'app-doc-tile',
  standalone: true,
  imports: [FluxFileIcon],
  templateUrl: './doc-tile.html',
  styleUrl: './doc-tile.scss',
  host: {
    'class': 'doc-tile',
    '[attr.data-doc-id]': 'row.id',
  }
})
export class DocTile {
  @Input({ required: true }) row!: DocGridRow;
  @Input() selected = false;

  @Output() tileClick = new EventEmitter<{ id: string; ctrlKey: boolean; shiftKey: boolean }>();
  @Output() open = new EventEmitter<void>();

  onClick(event: MouseEvent): void {
    // Alt cuenta como Ctrl para sumar/sacar de la seleccion (algunos usuarios lo usan como
    // modificador de multi-seleccion en vez de Ctrl).
    this.tileClick.emit({
      id: this.row.id,
      ctrlKey: event.ctrlKey || event.metaKey || event.altKey,
      shiftKey: event.shiftKey,
    });
  }
}
