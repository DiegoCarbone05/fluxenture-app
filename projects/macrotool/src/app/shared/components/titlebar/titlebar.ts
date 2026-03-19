import { Component, computed } from '@angular/core';
import { ViewsService } from '../../../views/views.service';

@Component({
  selector: 'app-titlebar',
  standalone: false,
  templateUrl: './titlebar.html',
  styleUrl: './titlebar.scss'
})
export class Titlebar {

  titlebarColor = computed(() => this.viewsService.getTitlebarColor());
  titlebarTextColor = computed(() => this.viewsService.getTitlebarTextColor());
  titlebarFloating = computed(() => this.viewsService.getTitlebarFloating());
  titlebarFullscreen = computed(() => this.viewsService.getTitlebarFullscreen());

  constructor(private viewsService: ViewsService) {

  }
}
