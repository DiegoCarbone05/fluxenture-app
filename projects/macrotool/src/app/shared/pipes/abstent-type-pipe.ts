import { Pipe, PipeTransform } from '@angular/core';
import { ABSENT_TYPES } from '../constants/typesValues.constant';

@Pipe({
  name: 'abstentType',
  standalone: true
})
export class AbstentTypePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return ABSENT_TYPES.find(t => t.value === value)?.label;
  }

}
