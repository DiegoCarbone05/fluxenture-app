import { AfterViewInit, Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Toolbar } from '../../../shared/components/toolbar/toolbar';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { EGender, Employee, ESector } from '../../../shared/models/Employee';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AddEmployee } from '../../dialogs/add-employee/add-employee';
import { EmployeeDrafts } from '../../dialogs/employee-drafts/employee-drafts';
import { MatSidenav } from '@angular/material/sidenav';
import { ViewsService } from '../../views.service';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { EmployeeDraftService } from '../../../core/services/employee-draft.service';


@Component({
  selector: 'app-eployees',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatTooltipModule, Toolbar,
  ],
  templateUrl: './eployees.html',
  styleUrl: './eployees.scss'
})
export class Eployees {

  isMobile = computed(() => this.viewsSvc.getIsMobile());
  @ViewChild("sideNav") sideNav!: MatSidenav;
  searchFormControl = new FormControl<string>('');
  readonly addEmployeeDialog = inject(MatDialog);

  employees = computed(() => this.employeeService.getEmployeesSignal()());
  findedEmployees = signal<Employee[]>([]);
  formMsg = signal<string>('');
  searchBy = signal<keyof Employee>('name');
  filters = signal<keyof Employee | null>(null);

  draftCount = computed(() => this.draftService.getDraftsSignal()().length);

  constructor(
    private employeeService: EmployeeService,
    private viewsSvc: ViewsService,
    private router: Router,
    private route: ActivatedRoute,
    private draftService: EmployeeDraftService,
  ) {

    this.route.queryParams.subscribe((params) => {
      const searchValue = params['q']?.trim();
      if (searchValue === "") {
        this.searchFormControl.reset();
        this.clearForms();
        return;
      }
      this.searchFormControl.setValue(searchValue);
      this.search();
    });

    this.searchFormControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      const term = value?.trim();
      if (term) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: term },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      } else {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: "" },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
    this.viewsSvc.openSidenav$.subscribe(() => {
      this.sideNav.toggle();
    });
  }


  openAddEmployeeDialog(draftId?: string) {
    const dialog = this.addEmployeeDialog.open(AddEmployee, {
      panelClass: 'full-screen-dialog',
      disableClose: true,
      data: draftId ? { draftId } : undefined,
    });

    dialog.afterClosed().subscribe((result: Employee | undefined) => {
      if (result) {
        if (result.id) {
          this.employeeService.updateEmployee(result.id, result).subscribe(() => {
            this.clearForms();
          });
        } else {
          this.employeeService.createEmployee(result).subscribe();
        }

      }
    });
  }

  openDraftsDialog() {
    const dialog = this.addEmployeeDialog.open(EmployeeDrafts, {
      panelClass: 'custom-flex-dialog',
    });

    dialog.afterClosed().subscribe((draftId: string | undefined) => {
      if (draftId) this.openAddEmployeeDialog(draftId);
    });
  }


  clearForms() {
    this.searchFormControl.reset();
    this.findedEmployees.set([]);
  }

  openEmployee(employee: Employee) {
    this.router.navigate(['/main', "app-pages", 'eployees', employee.id]);
  }

  search() {
    const searchValue = this.route.snapshot.queryParams['q'] || this.searchFormControl.value?.trim();
    this.searchFormControl.setValue(searchValue);
    if (searchValue) {
      this.formMsg.set('');
      this.employeeService.searchEmployees(searchValue).subscribe((employees: Employee[]) => {
        this.formMsg.set(employees?.length ? '' : 'No se encontraron empleados con la búsqueda');
        this.findedEmployees.set(employees?.length ? employees : []);
      });
    } else {
      this.formMsg.set('Por favor, ingrese un valor para buscar');
    }
  }

}
