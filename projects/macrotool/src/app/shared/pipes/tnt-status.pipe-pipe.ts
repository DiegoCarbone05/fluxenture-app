import { Pipe, PipeTransform } from '@angular/core';
import { Tnt } from '../models/Tnt.model';

@Pipe({
  name: 'tntStatusPipe',
  standalone: true
})
export class TntStatusPipePipe implements PipeTransform {

  async transform(value: Tnt[], ...args: unknown[]): Promise<unknown> {

    if (!value) {
      return 'No hay status';
    }

    const lastStatus = value[0].status

    if (lastStatus == "") {
      return 'No hay status';
    } else {
      return lastStatus;
    }
  }

}
