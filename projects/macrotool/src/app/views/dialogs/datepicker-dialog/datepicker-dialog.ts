import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MONTHS, YEARS } from '../../../shared/constants/general-constant';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-datepicker-dialog',
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatIconModule,
    FormsModule, CommonModule,
  ],
  templateUrl: './datepicker-dialog.html',
  styleUrl: './datepicker-dialog.scss'
})
export class DatepickerDialog implements OnInit {
  months = MONTHS
  years = YEARS;

  private readonly dialogRef = inject(MatDialogRef<DatepickerDialog>);
  readonly data = inject<{ month: number, year: number }>(MAT_DIALOG_DATA, { optional: true });

  ngOnInit() {
    if (this.data) {
      this.currentDate = this.data
    }

  }


  currentDate = {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  };

  onDateChange() {
    console.log(this.currentDate);
  }

  cancelDialog() {
    this.dialogRef.close();
  }

  acept() {
    this.dialogRef.close(this.currentDate);
  }
}
