import { Injectable } from '@angular/core';
import { AbsentType } from '../../shared/models/Absent.model';
import { EDocType } from '../../shared/models/Doc';
import { ABSENT_TYPES, DOC_TYPES } from '../../shared/constants/typesValues.constant';
import { DocsService } from './api/docs/docs.service';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(
    private docsService: DocsService,
  ) { }

  getAbstenFullName(type: AbsentType) {
    return ABSENT_TYPES.find(t => t.value === type)?.label;
  }

  getDocFullName(type: EDocType) {
    return DOC_TYPES.find(t => t.value === type)?.label;
  }

  openFile(docId: string) {
    if (docId == "") return;

    const link = document.createElement('a');

    this.docsService.getDoc(docId).subscribe({
      next: (doc) => {
        link.href = 'https://drive.google.com/file/d/' + doc.driveFileId + '/view';
        link.target = '_blank';
        link.click();
      },
      error: (err) => {
        console.error('Error cargando doc', err);
        link.href = 'https://drive.google.com/file/d/' + docId + '/view';
        link.target = '_blank';
        link.click();
      }
    });
  }

}
