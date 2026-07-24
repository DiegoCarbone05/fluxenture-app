import { Component, signal, OnInit, computed } from '@angular/core';
import { Electron } from './shared/services/electron';
import { AuthService } from './core/services/api/auth/auth.service';
import { Router, RouterOutlet } from '@angular/router';
import { AppService } from './core/services/app.service';
import { Titlebar } from './shared/components/titlebar/titlebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Titlebar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  isElectron = computed(() => this.appService.isElectron());

  constructor(private electron: Electron, private authService: AuthService, private router: Router, private appService: AppService) {
    this.appService.init();
  }

}
