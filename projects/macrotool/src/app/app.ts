import { Component } from '@angular/core';
import { AuthService } from './core/services/api/auth/auth.service';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  constructor(private authService: AuthService, private router: Router) {
  }

}
