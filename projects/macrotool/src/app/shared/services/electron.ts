import { Injectable, NgZone } from '@angular/core';

// const electron = (<any>window).require('electron');


@Injectable({
  providedIn: 'root'
})
export class Electron {

  constructor(private ngZone: NgZone) { }

  listenEvent<T>(name: string, callback: (value: T) => void) {
    // electron.ipcRenderer.on(name, (_: string, value: T) => {
    //   this.ngZone.run(() => {
    //     callback(value);
    //   });
    // });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(name: string, value?: any) {
    //angular -> electron. Angular emite un evento que luego debe ser atrapado por electron
    // if (value) {
    //   electron.ipcRenderer.send(name, value);
    // } else {
    //   electron.ipcRenderer.send(name);
    // }
  }

  sendSync(event: string, value?: any) {
    // if (value) {
    //   return electron.ipcRenderer.sendSync(event, value);
    // } else {
    //   return electron.ipcRenderer.sendSync(event);
    // }
  }

}
