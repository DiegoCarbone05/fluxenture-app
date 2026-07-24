import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { CdStatusChip } from '../../../shared/components/cd-status-chip/cd-status-chip';
import { TntStatusPipePipe } from '../../../shared/pipes/tnt-status.pipe-pipe';
import { Toolbar } from '../../../shared/components/toolbar/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { AddPdf } from '../../dialogs/add-pdf/add-pdf';
import { Cd } from '../../../shared/models/Cd.model';
import { Router } from '@angular/router';
import { CdService } from '../../../core/services/api/cd-api/cd.service';
import { EmployeeService } from '../../../core/services/api/employees/employee.service';
import { Prompt } from '../../dialogs/prompt/prompt';
import { StorageService } from '../../../core/services/api/storage/storage.service';

@Component({
  selector: 'app-tnt',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatTabsModule,
    CdStatusChip, TntStatusPipePipe, Toolbar,
  ],
  templateUrl: './tnt.html',
  styleUrl: './tnt.scss'
})
export class Tnt {

  cdsSignal = computed(() => this.cdService.getCdsSignal());
  sortedCds = computed(() =>
    [...this.cdsSignal()].sort((a, b) =>
      new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime()
    )
  );

  activeCds    = computed(() => this.sortedCds().filter(cd => !cd.trackingCompleted));
  completedCds = computed(() => this.sortedCds().filter(cd =>  cd.trackingCompleted));

  readonly dialog = inject(MatDialog);

  constructor(
    private router: Router,
    private cdService: CdService,
    private employeeService: EmployeeService,
    private storageService: StorageService,
  ) {}

  openCdsViewer(element: Cd): void {
    this.router.navigate(['/main', 'app-pages', 'tnt', 'cds-viewer', element.trackingNumber]);
  }

  deleteCd(cd: Cd): void {
    this.dialog.open(Prompt, {
      data: {
        title: 'Eliminar CD',
        desc: '¿Estás seguro de querer eliminar este CD?',
      }
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.cdService.deleteCd(cd.id).subscribe({
          next: () => {
            this.cdService.refreshCds().subscribe();
            this.storageService.deleteFile(cd.fileId).subscribe();
          },
          error: (error) => console.error(error)
        });
      }
    });
  }

  returnEmployeeName(employeeId: string): string {
    return this.employeeService.getLocalEmployeeById(employeeId)?.name || '—';
  }

  loadPDF(): void {
    this.dialog.open(AddPdf, {
      disableClose: true,
      panelClass: 'custom-flex-dialog'
    });
  }

  editCd(cd: Cd): void {
    this.dialog.open(AddPdf, {
      data: cd,
      panelClass: 'custom-flex-dialog'
    });
  }
}
