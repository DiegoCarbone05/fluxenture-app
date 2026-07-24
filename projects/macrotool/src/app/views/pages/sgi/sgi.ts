import { Component, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Toolbar } from '../../../shared/components/toolbar/toolbar';
import { MatSidenav } from '@angular/material/sidenav';
import { ViewsService } from '../../views.service';
import { FormBuilder, FormControl } from '@angular/forms';
import html2canvas from 'html2canvas';
import * as jspdf from 'jspdf';

@Component({
  selector: 'app-sgi',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, Toolbar,
  ],
  templateUrl: './sgi.html',
  styleUrl: './sgi.scss'
})
export class Sgi {
  isMobile = computed(() => this.viewsSvc.getIsMobile());
  @ViewChild("sideNav") sideNav!: MatSidenav;
  @ViewChild('content', { static: false }) content!: ElementRef;

  constructor(private viewsSvc: ViewsService, private fb: FormBuilder) {
  }


  date = new FormControl<Date | null>(null);
  employeeName = new FormControl<string | null>(null);

  async export() {
    const element = this.content.nativeElement;
    const fieldsets = element.querySelectorAll('fieldset');
    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
    const margin = 0;
    const pageWidth = 210;
    const pageHeight = 297;
    const maxContentHeight = 275; // Dejamos margen abajo
    let currentY = margin;

    // Forzamos a que todos los inputs muestren su contenido completo
    const inputs = element.querySelectorAll('input, textarea');
    inputs.forEach((input: any) => {
      input.style.height = 'auto';
      input.style.overflow = 'visible';
    });

    const fileName = `${this.employeeName.value || 'SGI'}-${new Date().toLocaleDateString()}-SGI.pdf`;

    for (let i = 0; i < fieldsets.length; i++) {
      const section = fieldsets[i] as HTMLElement;

      // Reducimos escala a 2 para evitar que el DOM se trabe
      const canvas = await html2canvas(section, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 950,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('content'); // usa el ID de tu contenedor
          if (el) el.style.padding = '20px';
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.90);
      const imgWidth = pageWidth - (margin * 2);
      const totalImgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = totalImgHeight;
      let sY = 0; // Posición de recorte en la imagen original

      // Bucle para manejar fieldsets que ocupan más de una página
      while (heightLeft > 0) {
        const spaceAvailable = maxContentHeight - currentY;
        const heightToPrint = Math.min(heightLeft, spaceAvailable);

        // Calculamos la proporción para el recorte del canvas
        const sourceY = (sY * canvas.width) / imgWidth;
        const sourceHeight = (heightToPrint * canvas.width) / imgWidth;

        // Creamos un canvas temporal para la "rebanada"
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx?.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

        pdf.addImage(tempCanvas.toDataURL('image/jpeg'), 'JPEG', 0, currentY, pageWidth, heightToPrint);

        heightLeft -= heightToPrint;
        sY += heightToPrint;

        if (heightLeft > 0) {
          pdf.addPage();
          currentY = margin;
        } else {
          currentY += heightToPrint + 5;
        }
      }

      // Pausa técnica para liberar el hilo principal
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    pdf.save(fileName);
  }

}
