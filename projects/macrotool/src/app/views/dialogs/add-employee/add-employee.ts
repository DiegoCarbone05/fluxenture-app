import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Employee, EGender, ECivilStatus, ESector } from '../../../shared/models/Employee';
import { ViewsService } from '../../views.service';

export interface AddEmployeeDialogData {
  employee?: Employee;
}

@Component({
  selector: 'app-add-employee',
  standalone: false,
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

  constructor(private viewSvc: ViewsService) {

  }

  readonly genderOptions: { value: EGender; label: string }[] = [
    { value: EGender.MALE, label: 'Masculino' },
    { value: EGender.FEMALE, label: 'Femenino' },
    { value: EGender.OTHER, label: 'Otro' },
  ];
  readonly civilStatusOptions = Object.values(ECivilStatus);
  readonly sectorOptions: { value: ESector; label: string }[] = [
    { value: ESector.DESMALEZADO, label: 'Desmalezado' },
    { value: ESector.CLEANING_OPERATOR, label: 'Operador de limpieza' },
    { value: ESector.ADMINISTRATION, label: 'Administración' },
  ];

  identificationForm = new FormGroup({
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
    isOperational: new FormControl(true),
    entryDate: new FormControl(''),
    leaveDate: new FormControl(''),
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
    }
  }

  private patchFormWithEmployee(emp: Employee): void {
    this.identificationForm.patchValue({
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
      isOperational: emp.isOperational,
      entryDate: emp.entryDate ?? '',
      leaveDate: emp.leaveDate ?? '',
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
      cuil: identification.cuil ?? 0,
      employeeID: work.employeeID ?? 0,
      isOperational: work.isOperational ?? true,
      sector: (work.sector != null ? Number(work.sector) : ESector.ADMINISTRATION) as ESector,
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
      entryDate: work.entryDate ?? undefined,
      leaveDate: work.leaveDate ?? undefined,
    });
    this.dialogRef.close(employee);
  }
}
