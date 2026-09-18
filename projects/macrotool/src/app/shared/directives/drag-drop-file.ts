import { Directive, EventEmitter, HostBinding, HostListener, Output, } from '@angular/core';

@Directive({
  selector: '[appDragDropFile]',
  standalone: true
})
export class DragDropFileDirective {
  // Un solo File, para los consumidores existentes (ej. AddDocDialog).
  @Output() fileDropped = new EventEmitter<File>();
  // Todos los archivos soltados, para consumidores que aceptan subida multiple (ej. la
  // grilla de Documentos). Aditivo: no reemplaza fileDropped, un mismo drop emite ambos.
  @Output() filesDropped = new EventEmitter<File[]>();
  @HostBinding('class.file-over') fileOver = false;

  @HostListener('dragover', ['$event']) onDragOver(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
  }

  @HostListener('drop', ['$event']) onDrop(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;

    const files = evt.dataTransfer?.files;
    if (files && files.length > 0) {
      // Emitimos solo el primer archivo
      this.fileDropped.emit(files[0]);
      this.filesDropped.emit(Array.from(files));
    }
  }
}