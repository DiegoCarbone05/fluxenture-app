import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';

import { TipoDocumentoService } from '../../../core/services/api/tipo-documento/tipo-documento.service';
import { TipoDocumento } from '../../../shared/models/TipoDocumento';

@Component({
  selector: 'app-manage-doc-types',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './manage-doc-types.html',
  styleUrl: './manage-doc-types.scss',
})
export class ManageDocTypes {
  private readonly dialogRef = inject(MatDialogRef<ManageDocTypes>);
  private readonly tipoDocumentoService = inject(TipoDocumentoService);
  private readonly snackBar = inject(MatSnackBar);

  newName = new FormControl('', Validators.required);
  saving = signal(false);
  /** El ultimo tipo creado en esta sesion del dialog, para poder auto-seleccionarlo al volver
   *  (ver AddDocDialog: "Agregar tipo" abre esto y espera el id de vuelta en afterClosed). */
  private lastCreatedId = signal<string | undefined>(undefined);

  tipos = computed(() => this.tipoDocumentoService.tipos());
  activeCount = computed(() => this.tipos().filter((t) => t.activo).length);

  add() {
    const name = (this.newName.value ?? '').trim();
    if (!name) return;

    this.saving.set(true);
    this.tipoDocumentoService.create(name).subscribe({
      next: (created) => {
        this.tipoDocumentoService.reload();
        this.lastCreatedId.set(created.id);
        this.newName.reset('');
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err.error ?? 'No se pudo crear el tipo', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  // No hay tipos "reservados": todos, incluidos los migrados del viejo EDocType, se archivan
  // igual. Si el tipo activo de un Doc esta archivado, AddDocDialog#docTypes lo sigue mostrando.
  toggleActive(tipo: TipoDocumento) {
    if (!tipo.id) return;

    this.saving.set(true);
    this.tipoDocumentoService.setActivo(tipo.id, !tipo.activo).subscribe({
      next: () => {
        this.tipoDocumentoService.reload();
        this.saving.set(false);
      },
      error: () => {
        this.snackBar.open('No se pudo actualizar el tipo', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  closeDialog() {
    this.dialogRef.close(this.lastCreatedId());
  }
}
