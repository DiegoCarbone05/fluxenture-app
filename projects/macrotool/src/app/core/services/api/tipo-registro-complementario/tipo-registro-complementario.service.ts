import { Injectable, computed, signal } from '@angular/core';
import { tap } from 'rxjs';
import { BaseApiService } from '../../base-api.service';
import { TipoRegistroComplementario } from '../../../../shared/models/TipoRegistroComplementario';

@Injectable({
  providedIn: 'root'
})
export class TipoRegistroComplementarioService extends BaseApiService<TipoRegistroComplementario> {
  protected override readonly endpoint = this.api + '/tipos-registro-complementario';

  private readonly _tipos = signal<TipoRegistroComplementario[]>([]);
  readonly tipos = computed(() => this._tipos());
  readonly activeTipos = computed(() => this._tipos().filter(t => t.activo));

  /** Refresca el catalogo (se cachea en signal para no repetir el fetch en cada dialog). */
  load() {
    return this.http.get<TipoRegistroComplementario[]>(this.endpoint).pipe(
      tap((tipos) => this._tipos.set(tipos))
    );
  }

  create(nombre: string) {
    return this.http.post<TipoRegistroComplementario>(this.endpoint, { nombre, activo: true });
  }

  setActivo(id: string, activo: boolean) {
    return this.http.patch<TipoRegistroComplementario>(`${this.endpoint}/${id}/activo`, { activo });
  }

  nombreDe(tipoId: string | undefined): string {
    if (!tipoId) return '—';
    return this._tipos().find(t => t.id === tipoId)?.nombre ?? '—';
  }
}
