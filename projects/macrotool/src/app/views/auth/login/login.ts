import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { LoginDTO } from '../../../shared/models/LoginDTO';
import { Router } from '@angular/router';
import { TextInput } from '../../../shared/components/text-input/text-input';

type LoginStep = 'email' | 'password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, TextInput],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

  step = signal<LoginStep>('email');
  errMsg = signal<boolean>(false);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
  }

  onError() {
    this.errMsg.set(true);
    setTimeout(() => {
      this.errMsg.set(false);
    }, 3000);
  }

  emailError(): string | null {
    const control = this.form.get('email');
    if (!control?.touched) return null;
    if (control.errors?.['required']) return 'Ingresá tu correo';
    if (control.errors?.['email']) return 'El email no es válido';
    return null;
  }

  goToPasswordStep() {
    const emailControl = this.form.get('email');
    emailControl?.markAsTouched();
    if (emailControl?.valid) {
      this.step.set('password');
    }
  }

  goToEmailStep() {
    this.step.set('email');
  }

  onSubmit() {
    if (this.step() !== 'password' || !this.form.valid) return;

    const mail = this.form.value.email as string;
    const password = this.form.value.password as string;
    const creds = new LoginDTO({ mail, password });

    this.authService.login(creds).subscribe({
      next: () => {
        this.router.navigate(['/main', 'app-pages', 'tnt']);
      },
      error: () => {
        this.onError();
      }
    });
  }
}
