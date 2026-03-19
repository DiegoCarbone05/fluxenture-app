import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  isElectron = signal<boolean>(false);

  constructor() {
    this.init();
  }

  init() {
    this.isElectron.set(navigator.userAgent.toLowerCase().includes('electron'));
  }

}
