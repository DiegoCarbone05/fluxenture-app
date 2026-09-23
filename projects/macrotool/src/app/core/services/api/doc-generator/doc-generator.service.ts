import { Injectable } from '@angular/core';
import { BaseApiService } from '../../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class DocGeneratorService extends BaseApiService<never> {
  protected override readonly endpoint = this.api + '/doc-generator/';

  /**
   * Manda el formulario ya completado (ver snapshotForm) y recibe el PDF armado por el back.
   * Se observan los eventos para poder mostrar "generando" mientras el server trabaja y el
   * porcentaje de descarga cuando empieza a llegar el archivo.
   */
  generatePdf(generatorId: string, html: string, fileName: string) {
    return this.http.post(`${this.endpoint}${generatorId}/pdf`, { html, fileName }, {
      responseType: 'blob',
      observe: 'events',
      reportProgress: true,
    });
  }
}
