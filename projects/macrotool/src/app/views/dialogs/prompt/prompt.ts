import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './prompt.html',
  styleUrl: './prompt.scss'
})
export class Prompt {
  readonly dialogRef = inject(MatDialogRef<Prompt>);
  readonly data = inject(MAT_DIALOG_DATA);

  closeDialog() {
    this.dialogRef.close();
  }
}
