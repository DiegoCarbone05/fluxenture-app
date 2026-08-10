import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
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

const SEEN_DELIVERED_KEY = 'flux_seen_delivered_cds';

@Component({
  selector: 'app-tnt',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatPaginatorModule,
    CdStatusChip,
    TntStatusPipePipe,
    Toolbar,
  ],
  templateUrl: './tnt.html',
  styleUrl: './tnt.scss',
})
export class Tnt {
  cdsSignal = computed(() => this.cdService.getCdsSignal());
  sortedCds = computed(() =>
    [...this.cdsSignal()].sort(
      (a, b) =>
        new Date(b.emissionDate).getTime() - new Date(a.emissionDate).getTime(),
    ),
  );

  activeCds = computed(() =>
    this.sortedCds().filter((cd) => !cd.trackingCompleted),
  );

  /** IDs de CDs entregadas que el usuario ya abrió al menos una vez, persistido en este navegador. */
  private seenDeliveredIds = signal<Set<string>>(this.loadSeenIds());

  // Las que todavía no se abrieron ("nuevas") quedan primero en la lista.
  completedCds = computed(() => {
    const seen = this.seenDeliveredIds();
    return this.sortedCds()
      .filter((cd) => cd.trackingCompleted)
      .sort((a, b) => {
        const aNew = seen.has(a.id) ? 0 : 1;
        const bNew = seen.has(b.id) ? 0 : 1;
        if (aNew !== bNew) return bNew - aNew;
        return (
          new Date(b.emissionDate).getTime() -
          new Date(a.emissionDate).getTime()
        );
      });
  });

  newDeliveredCount = computed(
    () => this.completedCds().filter((cd) => this.isNewlyDelivered(cd)).length,
  );

  readonly pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25, 50];

  activePageIndex = signal(0);
  completedPageIndex = signal(0);

  pagedActiveCds = computed(() => {
    const start = this.activePageIndex() * this.pageSize;
    return this.activeCds().slice(start, start + this.pageSize);
  });

  pagedCompletedCds = computed(() => {
    const start = this.completedPageIndex() * this.pageSize;
    return this.completedCds().slice(start, start + this.pageSize);
  });

  readonly dialog = inject(MatDialog);

  constructor(
    private router: Router,
    private cdService: CdService,
    private employeeService: EmployeeService,
    private storageService: StorageService,
  ) {
    // Si la lista se achica (ej: se elimina una CD) y la pagina actual queda vacia, retrocede.
    effect(() => {
      const maxPage = Math.max(
        0,
        Math.ceil(this.activeCds().length / this.pageSize) - 1,
      );
      if (this.activePageIndex() > maxPage) this.activePageIndex.set(maxPage);
    });
    effect(() => {
      const maxPage = Math.max(
        0,
        Math.ceil(this.completedCds().length / this.pageSize) - 1,
      );
      if (this.completedPageIndex() > maxPage)
        this.completedPageIndex.set(maxPage);
    });
  }

  onActivePage(event: PageEvent): void {
    this.activePageIndex.set(event.pageIndex);
  }

  onCompletedPage(event: PageEvent): void {
    this.completedPageIndex.set(event.pageIndex);
  }

  isNewlyDelivered(cd: Cd): boolean {
    return !!cd.trackingCompleted && !this.seenDeliveredIds().has(cd.id);
  }

  openCdsViewer(element: Cd): void {
    if (element.trackingCompleted) this.markAsSeen(element.id);
    this.router.navigate([
      '/main',
      'app-pages',
      'tnt',
      'cds-viewer',
      element.trackingNumber,
    ]);
  }

  markAllAsSeen(): void {
    const next = new Set(this.seenDeliveredIds());
    for (const cd of this.completedCds()) next.add(cd.id);
    this.persistSeenIds(next);
  }

  private loadSeenIds(): Set<string> {
    try {
      const raw = localStorage.getItem(SEEN_DELIVERED_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private markAsSeen(id: string) {
    const current = this.seenDeliveredIds();
    if (current.has(id)) return;

    const next = new Set(current);
    next.add(id);
    this.persistSeenIds(next);
  }

  private persistSeenIds(next: Set<string>): void {
    this.seenDeliveredIds.set(next);
    localStorage.setItem(SEEN_DELIVERED_KEY, JSON.stringify([...next]));
  }

  deleteCd(cd: Cd): void {
    this.dialog
      .open(Prompt, {
        data: {
          title: 'Eliminar CD',
          desc: '¿Estás seguro de querer eliminar este CD?',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.cdService.deleteCd(cd.id).subscribe({
            next: () => {
              this.cdService.refreshCds().subscribe();
              this.storageService.deleteFile(cd.fileId).subscribe();
            },
            error: (error) => console.error(error),
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
      panelClass: 'custom-flex-dialog',
    });
  }

  editCd(cd: Cd): void {
    this.dialog.open(AddPdf, {
      data: cd,
      panelClass: 'custom-flex-dialog',
    });
  }
}
