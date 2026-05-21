import { Injectable, signal } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { DocsService } from '../core/services/api/docs/docs.service';
import { Prompt } from './dialogs/prompt/prompt';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class ViewsService {

  private titlebarColor = signal<string>('#e6e6e6');
  private titlebarTextColor = signal<string>('#000000');
  private titlebarFloating = signal<boolean>(false);
  private titlebarFullscreen = signal<boolean>(false);
  private isMobile = signal<boolean>(false);
  private openSidenavSource = new Subject<void>();
  openSidenav$ = this.openSidenavSource.asObservable();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private docsService: DocsService,
    private dialog: MatDialog,
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .subscribe(result => {
        this.isMobile.set(result.matches);
      });
  }


  openSidenav() {
    this.openSidenavSource.next();
  }

  toggleSidenav() {
    this.openSidenavSource.next();
  }

  prompt(title: string, message: string) {

    return new Promise<boolean>((resolve) => {

      const dialogRef = this.dialog.open(Prompt, {
        data: {
          title: title,
          desc: message,
        }
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  openDriveFile(docId: string) {
    if (docId == "") return;

    const link = document.createElement('a');

    this.docsService.getDoc(docId).subscribe({
      next: (doc) => {
        console.log(doc);
        link.href = 'https://drive.google.com/file/d/' + doc.driveFileId + '/view';
        link.target = '_blank';
        link.click();
      },
      error: (err) => {
        console.error('Error cargando doc', err);
        link.href = 'https://drive.google.com/file/d/' + docId + '/view';
        link.target = '_blank';
        link.click();
      }
    });
  }

  public getIsMobile() {
    return this.isMobile();
  }

  public setTitlebarFloating(value: boolean) {
    this.titlebarFloating.set(value);
  }

  public setTitlebarColor(value: string) {
    this.titlebarColor.set(value);
  }

  public setTitlebarTextColor(value: string) {
    this.titlebarTextColor.set(value);
  }

  public setTitlebarFullscreen(value: boolean) {
    this.titlebarFullscreen.set(value);
  }

  public getTitlebarColor() {
    return this.titlebarColor();
  }

  public getTitlebarTextColor() {
    return this.titlebarTextColor();
  }

  public getTitlebarFullscreen() {
    return this.titlebarFullscreen();
  }

  public getTitlebarFloating() {
    return this.titlebarFloating();
  }

}
