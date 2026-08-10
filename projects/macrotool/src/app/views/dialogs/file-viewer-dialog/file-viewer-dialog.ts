import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface FileViewerData {
  /** Archivo ya subido a Drive. */
  driveFileId?: string;
  /** Archivo local todavia no subido (se previsualiza sin pasar por Drive). */
  localFile?: File;
  title?: string;
}

@Component({
  selector: 'app-file-viewer-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './file-viewer-dialog.html',
  styleUrl: './file-viewer-dialog.scss',
})
export class FileViewerDialog {
  previewUrl: SafeResourceUrl;
  externalUrl: string = '';

  constructor(
    private dialogRef: MatDialogRef<FileViewerDialog>,
    private sanitizer: DomSanitizer,
    @Inject(MAT_DIALOG_DATA) public data: FileViewerData,
  ) {
    if (data.driveFileId) {
      this.externalUrl = `https://drive.google.com/file/d/${data.driveFileId}/view`;
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://drive.google.com/file/d/${data.driveFileId}/preview`
      );
    } else if (data.localFile) {
      // El navegador puede renderizar PDF/imagenes directo desde un blob local, sin subir nada.
      this.externalUrl = URL.createObjectURL(data.localFile);
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.externalUrl);
    } else {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
