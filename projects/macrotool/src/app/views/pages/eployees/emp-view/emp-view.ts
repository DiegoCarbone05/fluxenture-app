import { Component, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EmployeeHistoryService } from '../../../../core/services/api/employee-history/employee-history.service';
import { EmployeeHistory } from '../../../../shared/models/EmployeeHistory.model';
import { Employee, ESector } from '../../../../shared/models/Employee';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { EMPLOYEE_HISTORY_TYPES, EMPLOYEE_SECTOR } from '../../../../shared/constants/typesValues.constant';
import { ViewsService } from '../../../views.service';
import { Prompt } from '../../../dialogs/prompt/prompt';
import { CreateEmployeeHistoryDialogComponent } from '../../../dialogs/create-employee-history/create-employee-history';
import { MatDialog } from '@angular/material/dialog';
import { AddEmployee } from '../../../dialogs/add-employee/add-employee';

@Component({
  selector: 'app-emp-view',
  standalone: false,
  templateUrl: './emp-view.html',
  styleUrl: './emp-view.scss'
})
export class EmpView {

  employeeHistory = signal<EmployeeHistory[]>([]);
  employee = signal<Employee | null>(null);
  employeeHistoryTypes = EMPLOYEE_HISTORY_TYPES
  employeeSector = EMPLOYEE_SECTOR

  constructor(
    private route: ActivatedRoute,
    private employeeHistoryService: EmployeeHistoryService,
    private employeeService: EmployeeService,
    private viewSvc: ViewsService,
    private addEmployeeDialog: MatDialog

  ) {
    this.route.params.subscribe((params) => {
      const empId = params['id'];
      this.employeeHistoryService.getHistoryByEmployeeId(empId).subscribe((history) => {
        this.employeeHistory.set(history);
      });
      this.employeeService.getEmployeeById(empId).subscribe((employee) => {
        this.employee.set(employee);
      });
    });


  }

  addHistory() {
    const dialog = this.addEmployeeDialog.open(CreateEmployeeHistoryDialogComponent, {
      panelClass: 'full-screen-dialog',
      data: { employeeId: this.employee()?.id },
      disableClose: true
    });

    dialog.afterClosed().subscribe((result: EmployeeHistory | undefined) => {
      if (result) {
        this.employeeHistory.update((history) => [...history, result]);
      }
    });
  }

  editEmployee() {
    const dialog = this.addEmployeeDialog.open(AddEmployee, {
      panelClass: 'full-screen-dialog',
      data: { employee: this.employee() },
      disableClose: true
    });

    dialog.afterClosed().subscribe((result: Employee | undefined) => {
      if (result) {
        this.employeeService.updateEmployee(this.employee()?.id!, result).subscribe(() => {
          this.employee.set(result);
        });
      }
    });
  }

  getEmployeeHistoryTypeLabel(type: string): string {
    const typeFound = this.employeeHistoryTypes.find((t) => t.value === type);
    return typeFound ? typeFound.label : type;
  }

  getEmployeeSectorLabel(sector: ESector | undefined): string {
    if (!sector) return '';

    const sectorFound = this.employeeSector.find((s) => s.value === sector);
    return sectorFound ? sectorFound.label : sector.toString();
  }

  viewHistory(item: EmployeeHistory) {
    if (item.docId) {
      this.viewSvc.openDriveFile(item.docId);
    }
  }

  deleteHistory(item: EmployeeHistory) {
    if (item.id) {
      this.viewSvc.prompt('Eliminar historial', '¿Está seguro de que desea eliminar este historial?').then((result) => {
        if (result) {
          this.employeeHistoryService.deleteHistory(item.id!).subscribe(() => {
            this.employeeHistory.update((history) => history.filter((h) => h.id !== item.id));
          });
        }
      });
    }
  }

}
