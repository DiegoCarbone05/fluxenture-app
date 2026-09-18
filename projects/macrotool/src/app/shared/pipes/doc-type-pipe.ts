import { Pipe, PipeTransform, inject } from '@angular/core';
import { TipoDocumentoService } from '../../core/services/api/tipo-documento/tipo-documento.service';

@Pipe({
  name: 'docType',
  standalone: true,
  pure: false, // el catalogo llega async (TipoDocumentoService.load) despues del primer render
})
export class DocTypePipe implements PipeTransform {
  private readonly tipoDocumentoService = inject(TipoDocumentoService);

  transform(value: unknown): string {
    return this.tipoDocumentoService.nombreDe(value as string | undefined);
  }
}
