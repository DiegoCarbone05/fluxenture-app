import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ViewsService } from '../../views.service';
import { AuthService } from '../../../core/services/api/auth/auth.service';

@Component({
  selector: 'app-splash',
  standalone: false,
  templateUrl: './splash.html',
  styleUrl: './splash.scss'
})
export class Splash {

  constructor(
    private viewsService: ViewsService,
  ) {
  }

  ngOnInit() {
    this.viewsService.setTitlebarFullscreen(true);
  }
}
