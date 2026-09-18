import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

/** Buscador de la barra de herramientas de tabla (escritorio). */
@Component({
  selector: 'flux-search-box',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './search-box.html',
  styleUrl: './search-box.scss'
})
export class SearchBox {
  @Input() control!: FormControl<string | null>;
  @Input() placeholder: string = 'Buscar';

  @ViewChild('input') private inputRef?: ElementRef<HTMLInputElement>;

  /** Le da foco al input — usado por botones "lupa" externos a este componente (ej. header). */
  focus(): void {
    this.inputRef?.nativeElement.focus();
  }
}
