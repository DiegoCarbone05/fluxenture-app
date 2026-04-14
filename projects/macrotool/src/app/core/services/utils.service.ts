import { Injectable } from '@angular/core';
import { AbsentType } from '../../shared/models/Absent.model';
import { EDocType } from '../../shared/models/Doc';
import { ABSENT_TYPES, DOC_TYPES } from '../../shared/constants/typesValues.constant';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  getAbstenFullName(type: AbsentType) {
    return ABSENT_TYPES.find(t => t.value === type)?.label;
  }

  getDocFullName(type: EDocType) {
    return DOC_TYPES.find(t => t.value === type)?.label;
  }
}
