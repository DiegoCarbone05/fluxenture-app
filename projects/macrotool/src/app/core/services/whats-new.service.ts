import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { currentAnnouncement } from '../config/release-notes';
import { WhatsNewDialog } from '../../views/dialogs/whats-new-dialog/whats-new-dialog';

const SEEN_KEY = 'flux.whatsNew.seenVersion';

/**
 * Muestra el dialogo de novedades una sola vez por anuncio (ver release-notes.ts). Lo visto se
 * guarda en localStorage: si no esta disponible (modo privado, bloqueado) simplemente no se muestra
 * nada, para no molestar con el mismo anuncio en cada inicio.
 */
@Injectable({ providedIn: 'root' })
export class WhatsNewService {
  private dialog = inject(MatDialog);
  private shownThisSession = false;

  showIfPending(): void {
    const note = currentAnnouncement();
    if (!note || this.shownThisSession) return;

    try {
      if (localStorage.getItem(SEEN_KEY) === note.version) return;
    } catch {
      return;
    }

    this.shownThisSession = true;
    this.dialog.open(WhatsNewDialog, {
      data: note,
      autoFocus: false,
      panelClass: 'whats-new-panel',
      disableClose: true,
    }).afterClosed().subscribe(() => {
      try {
        localStorage.setItem(SEEN_KEY, note.version);
      } catch { /* sin storage: se vuelve a mostrar la proxima vez */ }
    });
  }
}
