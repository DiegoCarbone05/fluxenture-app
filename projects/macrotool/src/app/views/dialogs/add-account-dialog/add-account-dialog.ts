import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UsersService } from '../../../core/services/api/users/users.service';
import { Account } from '../../../shared/models/Account';
import { UserRole } from '../../../shared/models/UserDto';

@Component({
  selector: 'app-add-account-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
  ],
  templateUrl: './add-account-dialog.html',
  styleUrl: './add-account-dialog.scss'
})
export class AddAccountDialog {
  private usersService = inject(UsersService);
  private dialogRef = inject(MatDialogRef<AddAccountDialog>);

  roles: UserRole[] = ['ADMIN', 'USER', 'GUEST'];
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  form = new FormGroup({
    mail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    role: new FormControl<UserRole>('USER', { nonNullable: true, validators: [Validators.required] }),
  });

  onSave() {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    const { mail, role } = this.form.getRawValue();

    this.usersService.addAccount({ mail, role }).subscribe({
      next: (created: Account) => {
        this.saving.set(false);
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err?.status === 403
            ? 'No tenés permisos de administrador para dar de alta cuentas.'
            : 'No se pudo dar de alta la cuenta.'
        );
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
