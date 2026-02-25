import { AfterViewInit, Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { EmployeeService } from '../../../core/services/employees/employee.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { EGender, Employee, ESector } from '../../../shared/models/Employee';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AddEmployee } from '../../dialogs/add-employee/add-employee';


@Component({
  selector: 'app-eployees',
  standalone: false,
  templateUrl: './eployees.html',
  styleUrl: './eployees.scss'
})
export class Eployees implements AfterViewInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  searchFormControl = new FormControl<string>('');
  readonly addPdfDialog = inject(MatDialog);
  readonly addEmployeeDialog = inject(MatDialog);

  openAddEmployeeDialog(employee?: Employee) {
    const dialog = this.addEmployeeDialog.open(AddEmployee, {
      panelClass: 'full-screen-dialog',
      data: { employee },
    });

    dialog.afterClosed().subscribe((result: Employee | undefined) => {
      if (result) {
        if (result.id) {
          this.employeeService.updateEmployee(result.id, result).subscribe(()=>{
            this.clearForms();
          });
        } else {
          this.employeeService.createEmployee(result).subscribe();
        }

      }
    });
  }

  findByOptions: { attr: keyof Employee; text: string }[] = [
    { attr: 'name', text: 'Nombre empleado' },
    { attr: 'documentNumber', text: 'Número de documento' },
    { attr: 'city', text: 'Ciudad' },
    { attr: 'employeeID', text: 'ID empleado' },
    { attr: 'cuil', text: 'CUIL' },
    { attr: 'phone', text: 'Teléfono' },
    { attr: 'cellPhone', text: 'Celular' },
    { attr: 'email', text: 'Email' },
  ];


  filterByOptions: { attr: keyof Employee; value: any; text: string }[] = [
    { attr: 'gender', value: EGender.MALE, text: 'Masculino' },
    { attr: 'gender', value: EGender.FEMALE, text: 'Femenino' },
    { attr: 'gender', value: EGender.OTHER, text: 'Otro' },
    { attr: 'sector', value: ESector.DESMALEZADO, text: 'Desmalezado' },
    { attr: 'sector', value: ESector.CLEANING_OPERATOR, text: 'Limpieza' },
    { attr: 'sector', value: ESector.ADMINISTRATION, text: 'Administración' },
    { attr: 'isOperational', value: true, text: 'Empleado operativo' },
    { attr: 'isOperational', value: false, text: 'Empleado no operativo' },
  ];

  employees = computed(() => this.employeeService.getEmployeesSignal()());
  displayedColumns: string[] = ['employeeID', 'documentNumber', 'name', 'isOperational', 'sector', 'city', 'actions'];
  dataSource = new MatTableDataSource<Employee>([]);

  searchBy = signal<keyof Employee>('name');
  filters = signal<keyof Employee | null>(null);

  constructor(private employeeService: EmployeeService) {

    this.searchFormControl.valueChanges.subscribe((value) => {
      if (value?.length === 0) {
        this.dataSource.data = [];
        this.connectPaginator();
        return;
      } else if (value?.length && value.length > 2) {
        this.search();
      }
    });
  }




  clearForms(){
    this.searchFormControl.reset();
    this.dataSource.data = [];
    this.connectPaginator();
  }

  ngAfterViewInit(): void {
    this.connectPaginator();
  }

  private connectPaginator(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }


  search() {
    const searchValue = this.searchFormControl.value;
    if (searchValue) {
      const employees = this.employees().filter((employee: Employee) => {

        let value = employee[this.searchBy()] as string;
        const searchValueLower = searchValue.toLowerCase();
        value = value.toLowerCase();
        return value.includes(searchValueLower)
      });
      this.dataSource.data = employees?.length ? employees : [];
      this.connectPaginator();
    }
  }

}
