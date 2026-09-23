import { Component, computed, ElementRef, inject, Input, signal, ViewChild } from '@angular/core';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { filter, lastValueFrom, map, tap } from 'rxjs';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PillButton } from '../../../../shared/components/pill-button/pill-button';
import { DocGeneratorService } from '../../../../core/services/api/doc-generator/doc-generator.service';
import { snapshotForm } from '../../../../shared/utils/form-snapshot';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { DocsService } from '../../../../core/services/api/docs/docs.service';
import { Doc, baseNameOf, extensionOf } from '../../../../shared/models/Doc';
import { docGeneratorById } from '../doc-generators';

type Stage = 'idle' | 'generating' | 'downloading' | 'saving';

/**
 * Marco comun de todo formulario del Generador de documentos: header con volver, acciones
 * "Guardar en Documentos" / "Descargar PDF" y el overlay de progreso. El formulario se
 * proyecta adentro y, al exportar, se congela (snapshotForm) y se manda al back, que arma
 * el PDF con la plantilla `generatorId`.
 *
 * Uso: <flux-doc-form-shell generatorId="sgi" [fileName]="fileName()"> ...form... </flux-doc-form-shell>
 */
@Component({
  selector: 'flux-doc-form-shell',
  standalone: true,
  imports: [PageHeader, PillButton, MatSnackBarModule, MatProgressSpinnerModule, MatProgressBarModule],
  templateUrl: './doc-form-shell.html',
  styleUrl: './doc-form-shell.scss'
})
export class DocFormShell {
  @Input({ required: true }) generatorId!: string;
  /** Nombre del PDF (con o sin .pdf). */
  @Input() fileName = '';

  @ViewChild('content', { static: true }) content!: ElementRef<HTMLElement>;

  private generatorSvc = inject(DocGeneratorService);
  private storageSvc = inject(StorageService);
  private docsSvc = inject(DocsService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  stage = signal<Stage>('idle');
  /** Porcentaje de descarga; null mientras el server genera o si no informa el tamaño. */
  progress = signal<number | null>(null);
  busy = computed(() => this.stage() !== 'idle');

  get generator() {
    return docGeneratorById(this.generatorId);
  }

  get pdfName(): string {
    const base = (this.fileName || this.generatorId).trim();
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  }

  goToHub(): void {
    this.router.navigate(['/main/app-pages/doc-generator']);
  }

  async download(): Promise<void> {
    const file = await this.generate();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('PDF descargado', 'OK', { duration: 2000 });
  }

  /**
   * Genera el PDF y lo guarda directo en Documentos, igual que un archivo arrastrado al explorador:
   * sin empleado ni tipo (cae en lpo/sin-asignar). Se asignan despues desde Documentos si hace falta.
   */
  async saveToDocs(): Promise<void> {
    const file = await this.generate(true);
    if (!file) return;
    this.stage.set('saving');
    try {
      const res: any = await lastValueFrom(this.storageSvc.uploadDoc(file));
      await lastValueFrom(this.docsSvc.saveDoc({
        driveFileId: res.response,
        extension: extensionOf(file.name),
        uploadDate: new Date(),
        description: baseNameOf(file.name),
      } as Doc));
      this.snackBar.open('Guardado en Documentos', 'Ver', { duration: 4000 })
        .onAction().subscribe(() => this.router.navigate(['/main/app-pages/docs']));
    } catch (err) {
      console.error('Error guardando en Documentos', err);
      this.snackBar.open('No se pudo guardar en Documentos', 'OK', { duration: 4000 });
    } finally {
      this.stage.set('idle');
    }
  }

  /** `keepBusy`: no libera el overlay al terminar, porque sigue otra etapa (guardado). */
  private async generate(keepBusy = false): Promise<File | null> {
    if (this.busy()) return null;
    this.stage.set('generating');
    this.progress.set(null);
    let ok = false;
    try {
      const html = await snapshotForm(this.content.nativeElement);
      const blob = await lastValueFrom(this.generatorSvc.generatePdf(this.generatorId, html, this.pdfName).pipe(
        tap(event => {
          if (event.type === HttpEventType.DownloadProgress) {
            this.stage.set('downloading');
            this.progress.set(event.total ? Math.round(100 * event.loaded / event.total) : null);
          }
        }),
        filter(event => event.type === HttpEventType.Response),
        map(event => event.body as Blob),
      ));
      ok = true;
      return new File([blob], this.pdfName, { type: 'application/pdf' });
    } catch (err) {
      console.error('Error generando el PDF', err);
      this.snackBar.open(await errorMessage(err), 'OK', { duration: 4000 });
      return null;
    } finally {
      if (!ok || !keepBusy) this.stage.set('idle');
    }
  }
}

/** Con responseType 'blob' el error del back (ApiError) tambien llega como Blob. */
async function errorMessage(err: unknown): Promise<string> {
  const fallback = 'No se pudo generar el PDF';
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return `${fallback}: sin conexión con el servidor`;
  try {
    const body = err.error instanceof Blob ? JSON.parse(await err.error.text()) : err.error;
    return body?.message ? `${fallback}: ${body.message}` : fallback;
  } catch {
    return fallback;
  }
}
