import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Employee, EGender, ECivilStatus, ESector } from '../../../shared/models/Employee';
import { ViewsService } from '../../views.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { CommonModule } from '@angular/common';
import { EmployeeDraftService } from '../../../core/services/employee-draft.service';
import { EMPLOYEE_SECTOR } from '../../../shared/constants/typesValues.constant';
import { WorkServicesService } from '../../../core/services/api/work-services/work-services.service';

export interface AddEmployeeDialogData {
  employee?: Employee;
  draftId?: string;
}

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule, MatStepperModule,
  ],
  templateUrl: './add-employee.html',
  styleUrl: './add-employee.scss'
})
export class AddEmployee implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AddEmployee>);
  private readonly dialogData = inject<AddEmployeeDialogData>(MAT_DIALOG_DATA, { optional: true });

  /** Employee to edit, or undefined for create mode */
  readonly employee: Employee | undefined = this.dialogData?.employee;
  readonly isEditMode = !!this.employee;
  isMobile = computed(() => this.viewSvc.getIsMobile());

  /** Id del borrador que se esta completando, si el dialog se abrio desde uno. */
  private currentDraftId = signal<string | undefined>(this.dialogData?.draftId);
  readonly isDraftMode = !!this.dialogData?.draftId;

  constructor(
    private viewSvc: ViewsService,
    private draftService: EmployeeDraftService,
    private workServicesSvc: WorkServicesService,
  ) {

  }

  readonly genderOptions: { value: EGender; label: string }[] = [
    { value: EGender.MALE, label: 'Masculino' },
    { value: EGender.FEMALE, label: 'Femenino' },
    { value: EGender.OTHER, label: 'Otro' },
  ];
  readonly civilStatusOptions = Object.values(ECivilStatus);
  // Mismo listado que usa la tabla de Empleados (EMPLOYEE_SECTOR), para que la
  // etiqueta de cada sector sea igual en todos lados.
  readonly sectorOptions = EMPLOYEE_SECTOR;

  /**
   * Algunos empleados tienen en el backend un valor de sector que ya no esta
   * en `sectorOptions` (datos viejos, cargados antes de que existiera este
   * enum). La tabla lo muestra igual como texto crudo (ver EmpSectorPipePipe),
   * pero el <mat-select> solo puede mostrar una seleccion si esa opcion
   * existe: sin esto, el campo aparecia vacio y guardar cualquier otro cambio
   * terminaba borrando el sector real del empleado.
   */
  /** Solo los vigentes: un servicio archivado no se ofrece para asignar. */
  get serviceOptions() {
    return this.workServicesSvc.getActiveServices();
  }

  /**
   * Mismo caso que extraSectorOption: si el empleado tiene un servicio archivado
   * (o que todavia no esta en la lista), la opcion se agrega igual para que el
   * <mat-select> pueda mostrarlo y guardar no se lo borre.
   */
  get extraServiceOption(): string | null {
    const current = this.employee?.service;
    if (!current) return null;
    return this.serviceOptions.some((s) => s.name === current) ? null : current;
  }

  get extraSectorOption(): { value: ESector; label: string } | null {
    const current = this.employee?.sector;
    if (!current) return null;
    if (this.sectorOptions.some((opt) => opt.value === current)) return null;
    return { value: current, label: `${current} (valor no reconocido)` };
  }

  identificationForm = new FormGroup({
    surname: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    cuil: new FormControl<number | null>(null, Validators.required),
    documentNumber: new FormControl(''),
  });

  personalForm = new FormGroup({
    birthDate: new FormControl(''),
    gender: new FormControl<EGender>(EGender.MALE),
    civilStatus: new FormControl<ECivilStatus>(ECivilStatus.SINGLE),
    nationality: new FormControl(''),
  });

  workForm = new FormGroup({
    employeeID: new FormControl<number | null>(null, Validators.required),
    sector: new FormControl<ESector>(ESector.ADMINISTRATION, Validators.required),
    // Texto libre por ahora: la lista administrable de servicios todavia no existe.
    service: new FormControl(''),
    isOperational: new FormControl(true),
  });

  addressForm = new FormGroup({
    adress: new FormControl(''),
    city: new FormControl(''),
    province: new FormControl(''),
    country: new FormControl(''),
    zipCode: new FormControl(''),
  });

  contactForm = new FormGroup({
    phone: new FormControl(''),
    cellPhone: new FormControl(''),
    email: new FormControl('', Validators.email),
  });

  form = new FormGroup({
    identification: this.identificationForm,
    personal: this.personalForm,
    work: this.workForm,
    address: this.addressForm,
    contact: this.contactForm,
  });

  ngOnInit(): void {
    if (this.employee) {
      this.patchFormWithEmployee(this.employee);
    } else if (this.dialogData?.draftId) {
      const draft = this.draftService.getById(this.dialogData.draftId);
      if (draft) this.form.patchValue(draft.formValue);
    }
  }

  private patchFormWithEmployee(emp: Employee): void {
    this.identificationForm.patchValue({
      surname: emp.surname ?? '',
      name: emp.name,
      cuil: emp.cuil,
      documentNumber: emp.documentNumber,
    });
    this.personalForm.patchValue({
      birthDate: emp.birthDate,
      gender: emp.gender,
      civilStatus: emp.civilStatus,
      nationality: emp.nationality,
    });
    this.workForm.patchValue({
      employeeID: emp.employeeID,
      sector: emp.sector,
      service: emp.service ?? '',
      isOperational: emp.isOperational,
    });
    this.addressForm.patchValue({
      adress: emp.adress ?? '',
      city: emp.city,
      province: emp.province,
      country: emp.country,
      zipCode: emp.zipCode,
    });
    this.contactForm.patchValue({
      phone: emp.phone ?? '',
      cellPhone: emp.cellPhone ?? '',
      email: emp.email,
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }

  saveEmployee() {
    if (this.form.invalid) return;
    const identification = this.identificationForm.value;
    const personal = this.personalForm.value;
    const work = this.workForm.value;
    const address = this.addressForm.value;
    const contact = this.contactForm.value;

    const employee = new Employee({
      ...(this.employee?.id && { id: this.employee.id }),
      name: identification.name ?? '',
      surname: identification.surname ?? '',
      cuil: identification.cuil ?? 0,
      employeeID: work.employeeID ?? 0,
      isOperational: work.isOperational ?? true,
      sector: work.sector ?? ESector.ADMINISTRATION,
      service: work.service?.trim() || undefined,
      documentType: undefined,
      documentNumber: identification.documentNumber ?? '',
      birthDate: personal.birthDate ?? '',
      gender: personal.gender ?? EGender.MALE,
      civilStatus: personal.civilStatus ?? ECivilStatus.SINGLE,
      nationality: personal.nationality ?? '',
      adress: address.adress ?? undefined,
      city: address.city ?? '',
      province: address.province ?? '',
      country: address.country ?? '',
      zipCode: address.zipCode ?? '',
      phone: contact.phone ?? undefined,
      cellPhone: contact.cellPhone ?? undefined,
      email: contact.email ?? '',
      // Ya no se cargan a mano aca: se derivan del historial (alta/despido).
      entryDate: this.employee?.entryDate,
      leaveDate: this.employee?.leaveDate,
    });

    // Si esto vino de un borrador, ya se completo y se va a guardar de verdad: se descarta.
    const draftId = this.currentDraftId();
    if (draftId) this.draftService.remove(draftId);

    this.dialogRef.close(employee);
  }

  // Guarda el form crudo (sin validar) como borrador local, para completarlo mas adelante.
  saveDraft(): void {
    const draft = this.draftService.save(this.currentDraftId(), this.form.getRawValue());
    this.currentDraftId.set(draft.id);
    this.dialogRef.close();
  }
}
