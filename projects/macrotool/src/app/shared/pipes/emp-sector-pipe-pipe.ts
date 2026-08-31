import { Pipe, PipeTransform } from '@angular/core';
import { EMPLOYEE_SECTOR } from '../constants/typesValues.constant';
import { ESector } from '../models/Employee';

@Pipe({
  name: 'empSectorPipe',
  standalone: true
})
export class EmpSectorPipePipe implements PipeTransform {


  employeeSector = EMPLOYEE_SECTOR

  transform(sector: ESector | undefined, ...args: unknown[]): string {
    if (!sector) return '';

    const sectorFound = this.employeeSector.find((s) => s.value === sector);
    return sectorFound ? sectorFound.label : sector.toString();
  }

}
