import { Directive, EventEmitter, HostBinding, HostListener, Output, } from '@angular/core';

@Directive({
  selector: '[appDragDropFile]',
  standalone: false
})
export class DragDropFileDirective {
  // Ahora emitimos un solo File
  @Output() fileDropped = new EventEmitter<File>();
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
    }
  }
}