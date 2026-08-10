import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmployeeDraftService } from '../../../core/services/employee-draft.service';
import { EmployeeDraft } from '../../../shared/models/EmployeeDraft';
import { Prompt } from '../prompt/prompt';

@Component({
  selector: 'app-employee-drafts',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './employee-drafts.html',
  styleUrl: './employee-drafts.scss'
})
export class EmployeeDrafts {
  readonly dialogRef = inject(MatDialogRef<EmployeeDrafts>);
  private readonly draftService = inject(EmployeeDraftService);
  private readonly dialog = inject(MatDialog);

  drafts = computed(() =>
    [...this.draftService.getDraftsSignal()()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  );

  draftName(draft: EmployeeDraft): string {
    const name = draft.formValue?.['identification']?.['name'];
    return (name?.trim() as string) || 'Empleado sin nombre';
  }

  continueDraft(draft: EmployeeDraft): void {
    this.dialogRef.close(draft.id);
  }

  discardDraft(draft: EmployeeDraft): void {
    this.dialog.open(Prompt, {
      data: {
        title: 'Descartar borrador',
        desc: `¿Estás seguro de querer descartar el borrador de "${this.draftName(draft)}"? Esta acción no se puede deshacer.`,
      }
    }).afterClosed().subscribe((result) => {
      if (result) this.draftService.remove(draft.id);
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
