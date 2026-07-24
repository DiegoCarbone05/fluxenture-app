import { Component, signal } from '@angular/core';
import { ViewsService } from '../../views.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { LoginDTO } from '../../../shared/models/LoginDTO';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

  errMsg = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  onError() {
    this.errMsg.set(true);
    setTimeout(() => {
      this.errMsg.set(false);
    }, 3000);
  }

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  constructor(
    private viewsService: ViewsService,
    private authService: AuthService,
    private router: Router
  ) {
    this.viewsService.setTitlebarFullscreen(true);
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    const mail = this.form.value.email as string;
    const password = this.form.value.password as string;
    if (this.form.valid) {
      const creds = new LoginDTO({ mail, password });
      this.authService.login(creds).subscribe({
        next: () => {
          this.router.navigate(['/main', "app-pages", 'tnt']);
          this.viewsService.setTitlebarFullscreen(false);
        },
        error: () => {
          this.onError();
        }
      });
    }
  }
}
