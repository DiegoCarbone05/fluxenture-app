import { Component, Input, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TipoDocumentoService } from '../../../core/services/api/tipo-documento/tipo-documento.service';
import { DocTypeColor, colorForType, isGenericFileType } from '../../constants/doc-type-colors.constant';

/**
 * "Canvas" de icono de archivo para la grilla de Documentos: fondo/texto segun el tipo de
 * documento (o la extension si no tiene tipo), leyenda debajo, badge de "sin dueño".
 * El color viene de un mapa fijo (doc-type-colors.constant) — no requiere que cada tipo
 * tenga un icono/color dedicado, cualquiera no mapeado cae en gris neutro.
 */
@Component({
  selector: 'flux-file-icon',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  templateUrl: './flux-file-icon.html',
  styleUrl: './flux-file-icon.scss'
})
export class FluxFileIcon {
  private readonly tipoDocumentoService = inject(TipoDocumentoService);

  @Input() extension?: string;
  @Input() typeId?: string;
  @Input() text?: string;
  @Input() selected = false;
  @Input() blocked = false;
  @Input() size: 'md' | 'lg' = 'md';

  /** Texto principal del icono: abreviatura del tipo si hay uno, si no la extension.
   *  Los tipos "genericos" (ej. Otro) se tratan igual que sin tipo — da a entender que es
   *  simplemente un archivo, no un documento procesable. */
  mainText(): string {
    if (this.typeId && !isGenericFileType(this.typeId)) {
      const nombre = this.tipoDocumentoService.nombreDe(this.typeId);
      return this.abbreviate(nombre);
    }
    return (this.extension || '?').toUpperCase();
  }

  /** Subtexto (la extension) — solo se muestra cuando hay tipo asignado y no es generico. */
  subText(): string | undefined {
    if (!this.typeId || isGenericFileType(this.typeId) || !this.extension) return undefined;
    return this.extension.toUpperCase();
  }

  /** Extension debajo del nombre del archivo — visible siempre que se conozca, con o sin tipo. */
  extensionLabel(): string | undefined {
    return this.extension?.toUpperCase();
  }

  color(): DocTypeColor {
    return colorForType(this.typeId);
  }

  private abbreviate(nombre: string): string {
    const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const compact = stripAccents(nombre).replace(/\s+/g, '');
    if (compact.length <= 5) return compact.toUpperCase() || '?';
    const firstWord = stripAccents(nombre.trim()).split(/\s+/)[0];
    return firstWord.slice(0, 5).toUpperCase();
  }
}
