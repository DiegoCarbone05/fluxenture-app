import { Component, signal } from '@angular/core';
import { AbsentService } from '../../../../core/services/api/absents/absent.service';
import { ActivatedRoute } from '@angular/router';
import { AbsentResponseDTO } from '../../../../shared/models/AbsentResponseDTO';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { Employee } from '../../../../shared/models/Employee';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';

@Component({
  selector: 'app-absent-view',
  standalone: false,
  templateUrl: './absent-view.html',
  styleUrl: './absent-view.scss'
})
export class AbsentView {

  absent = signal<AbsentResponseDTO | null>(null);
  employee = signal<EmployeeDTO | null>(null);

  constructor(
    private absentService: AbsentService,
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private storageService: StorageService
  ) {
    const id = this.route.snapshot.params['id'];
    const absent = this.absentService.getAbsentById(id);

    if (absent) {
      this.absent.set(absent);
      const employee = this.employeeService.getLocalEmployeeById(absent.employeeId);
      if (employee) {
        this.employee.set(employee);
      }
    }
  }

  openFile(fileId: string | undefined) {
    if (!fileId) return;
    const link = document.createElement('a');
    link.href = 'https://drive.google.com/file/d/' + fileId + '/view';
    link.target = '_blank';
    link.click();
  }

  downloadFile(fileId: string | undefined) {
    if (fileId) {
      this.storageService.downloadFile(fileId).subscribe((res) => {
        const blob = new Blob([res], { type: res.type });
        const type = res.type.split("/")[1]
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `DOC. DE AUSENCIA [${this.absent()?.type}] - ${this.employee()?.name} - [${this.absent()?.originalStartDate} - ${this.absent()?.originalEndDate}].${type}`;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  }

}
