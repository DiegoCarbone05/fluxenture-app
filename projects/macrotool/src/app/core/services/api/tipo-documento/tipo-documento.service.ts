import { Injectable, computed, signal } from '@angular/core';
import { tap } from 'rxjs';
import { BaseApiService } from '../../base-api.service';
import { TipoDocumento } from '../../../../shared/models/TipoDocumento';

@Injectable({
  providedIn: 'root'
})
export class TipoDocumentoService extends BaseApiService<TipoDocumento> {
  protected override readonly endpoint = this.api + '/tipos-documento';

  private readonly _tipos = signal<TipoDocumento[]>([]);
  readonly tipos = computed(() => this._tipos());
  readonly activeTipos = computed(() => this._tipos().filter(t => t.activo));

  private loaded = false;

  constructor() {
    super();
    // Igual que EmployeeService: se carga apenas alguien inyecta el servicio (siempre dentro del
    // area autenticada), no hace falta que cada componente se acuerde de llamar load().
    this.load();
  }

  /** Carga el catalogo (se cachea en signal); llamadas siguientes son no-op salvo que fallen. */
  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<TipoDocumento[]>(this.endpoint).pipe(
      tap((tipos) => this._tipos.set(tipos))
    ).subscribe({ error: () => { this.loaded = false; } });
  }

  /** Fuerza un refetch (ej: despues de crear un tipo nuevo desde una futura UI de administracion). */
  reload() {
    this.loaded = false;
    this.load();
  }

  create(nombre: string) {
    return this.http.post<TipoDocumento>(this.endpoint, { nombre, activo: true });
  }

  setActivo(id: string, activo: boolean) {
    return this.http.put<TipoDocumento>(`${this.endpoint}/${id}/activo`, { activo });
  }

  nombreDe(tipoId: string | undefined | null): string {
    if (!tipoId) return '—';
    return this._tipos().find(t => t.id === tipoId)?.nombre ?? tipoId;
  }
}
