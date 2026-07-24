import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AbstentTypePipe } from '../../../../shared/pipes/abstent-type-pipe';
import { Toolbar } from '../../../../shared/components/toolbar/toolbar';
import { AbsentService } from '../../../../core/services/api/absents/absent.service';
import { ActivatedRoute } from '@angular/router';
import { AbsentResponseDTO } from '../../../../shared/models/AbsentResponseDTO';
import { EmployeeService } from '../../../../core/services/api/employees/employee.service';
import { StorageService } from '../../../../core/services/api/storage/storage.service';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';
import { AddAbsentDialog } from '../../../dialogs/add-absent-dialog/add-absent-dialog';

@Component({
  selector: 'app-absent-view',
  standalone: true,
  imports: [CommonModule, DatePipe, MatButtonModule, MatIconModule, AbstentTypePipe, Toolbar],
  templateUrl: './absent-view.html',
  styleUrl: './absent-view.scss'
})
export class AbsentView {

  absent = signal<AbsentResponseDTO | null>(null);
  employee = signal<EmployeeDTO | null>(null);

  private readonly dialog = inject(MatDialog);

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

  editAbsent() {
    const dialogRef = this.dialog.open(AddAbsentDialog, {
      disableClose: true,
      data: this.absent()
    });
    dialogRef.afterClosed().subscribe((result: AbsentResponseDTO | undefined) => {
      if (result) {
        this.absent.set(result);
      }
    });
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
