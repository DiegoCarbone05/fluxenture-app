import { Pipe, PipeTransform } from '@angular/core';
import { fullNameOf } from '../models/Employee';

/** Nombre completo de un empleado (APELLIDO NOMBRES, ver fullNameOf) para los templates. */
@Pipe({
  name: 'fullName',
  standalone: true,
})
export class FullNamePipe implements PipeTransform {
  transform(employee: { name?: string; surname?: string } | null | undefined): string {
    return fullNameOf(employee);
  }
}
