import { Pipe, PipeTransform } from '@angular/core';
import { Tnt } from '../models/Tnt.model';

@Pipe({
  name: 'tntStatusPipe',
  standalone: false
})
export class TntStatusPipePipe implements PipeTransform {

  async transform(value: Tnt[], ...args: unknown[]): Promise<unknown> {
    
    const lastStatus = value[value.length - 1].status

    if (lastStatus == "") {
      return 'No hay status';
    } else {
      return lastStatus;
    }
  }

}
