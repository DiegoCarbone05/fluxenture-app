import { Component, signal, OnInit, computed } from '@angular/core';
import { Electron } from './shared/services/electron';
import { AuthService } from './core/services/api/auth/auth.service';
import { Router } from '@angular/router';
import { AppService } from './core/services/app.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App {

  isElectron = computed(() => this.appService.isElectron());

  constructor(private electron: Electron, private authService: AuthService, private router: Router, private appService: AppService) {
    this.appService.init();
  }

}
