import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  isElectron = signal<boolean>(false);
  dateOfData = signal<{ year: number, month: number }>(this.getDateOfData());

  constructor() {
    this.init();
  }

  init() {
    this.isElectron.set(navigator.userAgent.toLowerCase().includes('electron'));
  }

  setDateOfData(date: { year: number, month: number }) {
    localStorage.setItem('dateOfData', JSON.stringify(date));
  }

  getDateOfData() {
    return JSON.parse(localStorage.getItem('dateOfData') || '{"month":' + (new Date().getMonth() + 1) + ',"year":' + new Date().getFullYear() + '}');
  }

}
