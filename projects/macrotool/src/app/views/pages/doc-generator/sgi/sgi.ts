import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { DocFormShell } from '../doc-form-shell/doc-form-shell';

/**
 * Generador SGI - Planilla de analisis de incidentes (F-SEG-03). El formulario es HTML plano;
 * el PDF lo arma el back con la plantilla "sgi" (resources/doc-templates/sgi.css).
 */
@Component({
  selector: 'app-sgi',
  standalone: true,
  imports: [ReactiveFormsModule, DocFormShell],
  templateUrl: './sgi.html',
  styleUrl: './sgi.scss'
})
export class Sgi {
  date = new FormControl<Date | null>(null);
  employeeName = new FormControl<string | null>(null);

  get fileName(): string {
    const today = new Date().toLocaleDateString('es-AR').replaceAll('/', '-');
    const employee = this.employeeName.value?.trim();
    return employee ? `SGI - ${employee} - ${today}` : `SGI - ${today}`;
  }
}
