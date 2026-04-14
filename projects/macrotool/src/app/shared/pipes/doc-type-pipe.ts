import { Pipe, PipeTransform } from '@angular/core';
import { DOC_TYPES } from '../constants/typesValues.constant';

@Pipe({
  name: 'docType',
  standalone: false
})
export class DocTypePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return DOC_TYPES.find(t => t.value === value)?.label;
  }

}
