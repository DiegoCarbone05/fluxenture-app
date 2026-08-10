import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  dateOfData = signal<{ year: number, month: number }>(this.getDateOfData());

  setDateOfData(date: { year: number, month: number }) {
    localStorage.setItem('dateOfData', JSON.stringify(date));
  }

  getDateOfData() {
    return JSON.parse(localStorage.getItem('dateOfData') || '{"month":' + (new Date().getMonth() + 1) + ',"year":' + new Date().getFullYear() + '}');
  }

}
