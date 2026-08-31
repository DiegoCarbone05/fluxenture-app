import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/api/auth/auth.service';

@Component({
  selector: 'app-not-authorized',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './not-authorized.html',
  styleUrl: './not-authorized.scss'
})
export class NotAuthorized {

  constructor(private authService: AuthService) {
  }

  logout() {
    this.authService.logout();
  }
}
