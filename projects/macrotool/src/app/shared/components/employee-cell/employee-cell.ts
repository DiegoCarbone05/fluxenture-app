import { Component, Input } from '@angular/core';
import { EmpSectorPipePipe } from '../../pipes/emp-sector-pipe-pipe';
import { ESector } from '../../models/Employee';

/**
 * Celda "Empleado y sector" de las tablas de escritorio: avatar con
 * iniciales, nombre, chip de legajo y sector. La usan Empleados y las tres
 * tablas de Ausencias.
 */
@Component({
  selector: 'flux-employee-cell',
  standalone: true,
  imports: [EmpSectorPipePipe],
  templateUrl: './employee-cell.html',
  styleUrl: './employee-cell.scss'
})
export class EmployeeCell {
  @Input() initials: string = '';
  @Input() name: string = '';
  @Input() legajo: string = '';
  @Input() sector?: ESector;
}
