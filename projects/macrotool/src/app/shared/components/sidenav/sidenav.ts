import { Component, computed, inject } from '@angular/core';
import { ViewsService } from '../../../views/views.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'flux-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss'
})
export class Sidenav {

  private viewsSvc = inject(ViewsService);
  isMobile = computed(() => this.viewsSvc.getIsMobile());

  closeSidenav() {
    if (this.isMobile()) {
      this.viewsSvc.toggleSidenav();
    }
  }
}
