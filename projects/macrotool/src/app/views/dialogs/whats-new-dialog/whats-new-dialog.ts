import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ReleaseNote } from '../../../core/config/release-notes';
import { APP_VERSION } from '../../../core/config/app-version.generated';

/** Dialogo "Novedades" que se abre una vez despues de un deploy con anuncio (ver WhatsNewService). */
@Component({
  selector: 'app-whats-new-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule],
  templateUrl: './whats-new-dialog.html',
  styleUrl: './whats-new-dialog.scss'
})
export class WhatsNewDialog {
  readonly note = inject<ReleaseNote>(MAT_DIALOG_DATA);
  readonly build = APP_VERSION;
  private dialogRef = inject(MatDialogRef<WhatsNewDialog>);
  private router = inject(Router);

  goToCta(): void {
    this.dialogRef.close();
    if (this.note.cta) this.router.navigateByUrl(this.note.cta.route);
  }
}
