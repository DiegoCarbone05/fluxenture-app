import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { DOC_GENERATORS } from './doc-generators';

/** Hub del Generador de documentos: una tarjeta por documento generable (ver DOC_GENERATORS). */
@Component({
  selector: 'app-doc-generator',
  standalone: true,
  imports: [RouterLink, MatIconModule, PageHeader],
  templateUrl: './doc-generator.html',
  styleUrl: './doc-generator.scss'
})
export class DocGenerator {
  readonly generators = DOC_GENERATORS;
}
