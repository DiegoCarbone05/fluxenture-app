import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/api/auth/auth.service';
import { UsersService } from '../../../core/services/api/users/users.service';
import { ViewsService } from '../../views.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PillButton } from '../../../shared/components/pill-button/pill-button';
import { IconButton } from '../../../shared/components/icon-button/icon-button';
import { RowActions } from '../../../shared/components/row-actions/row-actions';
import { TableToolbar } from '../../../shared/components/table-toolbar/table-toolbar';
import { SearchBox } from '../../../shared/components/search-box/search-box';
import { M3SearchBar } from '../../../shared/components/m3-search-bar/m3-search-bar';
import { M3ListItem } from '../../../shared/components/m3-list-item/m3-list-item';
import { StatsGrid } from '../../../shared/components/stats-grid/stats-grid';
import { M3StatsRow } from '../../../shared/components/m3-stats-row/m3-stats-row';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { FabButton } from '../../../shared/components/fab-button/fab-button';
import { AddAccountDialog } from '../../dialogs/add-account-dialog/add-account-dialog';
import { StatCardData } from '../../../shared/models/StatCardData';
import { Account } from '../../../shared/models/Account';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatTooltipModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    PageHeader, PillButton, IconButton, RowActions, TableToolbar, SearchBox, M3SearchBar,
    M3ListItem, StatsGrid, M3StatsRow, EmptyState, FabButton,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss'
})
export class Users {
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private viewsSvc = inject(ViewsService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  me = computed(() => this.authService.getUserSignal()());
  isAdmin = computed(() => this.me()?.role === 'ADMIN');
  isMobile = computed(() => this.viewsSvc.getIsMobile());
  meInitials = computed(() => (this.me()?.username ?? '').slice(0, 2).toUpperCase());

  loadingAccounts = signal(false);
  deletingMail = signal<string | null>(null);
  private accountsRequested = signal(false);

  searchFormControl = new FormControl('', { nonNullable: true });
  private searchTerm = signal('');

  accounts = this.usersService.getAccountsSignal();

  filteredAccounts = computed(() => {
    const term = this.searchTerm();
    const rows = this.accounts();

    if (!term) return rows;
    return rows.filter(
      (account) => account.mail.toLowerCase().includes(term) || account.role.toLowerCase().includes(term)
    );
  });

  resultsLabel = computed(() => {
    const n = this.filteredAccounts().length;
    return n === 1 ? '1 cuenta' : `${n} cuentas`;
  });

  /** Mismo formato de flux-stat-card/flux-m3-stat-card que usan Empleados y Ausencias. */
  stats = computed<StatCardData[]>(() => {
    const rows = this.accounts();
    const total = rows.length;
    const admins = rows.filter((account) => account.role === 'ADMIN').length;
    const standard = total - admins;

    const share = (value: number) => (total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`);

    return [
      {
        label: 'Total cuentas',
        value: total,
        icon: 'group',
        iconBg: 'rgba(4,104,215,0.1)',
        iconFg: '#0468d7',
        note: '',
        noteFg: '#9aa0ac',
        noteText: 'habilitadas en Fluxenture',
      },
      {
        label: 'Administradores',
        value: admins,
        icon: 'shield_person',
        iconBg: '#d4edbc',
        iconFg: '#11734b',
        note: share(admins),
        noteFg: '#11734b',
        noteText: 'del total',
      },
      {
        label: 'Acceso estándar',
        value: standard,
        icon: 'person',
        iconBg: '#ecf2fd',
        iconFg: '#3d7dc7',
        note: share(standard),
        noteFg: '#3d7dc7',
        noteText: 'del total',
      },
    ];
  });

  constructor() {
    this.searchFormControl.valueChanges.subscribe((value) => {
      this.searchTerm.set((value ?? '').trim().toLowerCase());
    });

    // isAdmin() puede tardar en resolverse (Pages recien esta llamando a
    // saveUserInSignal en un refresh directo de /users): el effect dispara
    // la primera carga apenas el rol este disponible, en vez de solo al construir.
    effect(() => {
      if (this.isAdmin() && !this.accountsRequested()) {
        this.accountsRequested.set(true);
        this.refreshAccounts();
      }

      console.log('this.isAdmin()', this.me());
    });
  }

  refreshAccounts() {
    this.loadingAccounts.set(true);
    this.usersService.refreshAccounts().subscribe({
      next: () => this.loadingAccounts.set(false),
      error: () => {
        this.loadingAccounts.set(false);
        this.snackBar.open('No se pudo cargar la lista de cuentas.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  openAddAccountDialog() {
    const ref = this.dialog.open(AddAccountDialog, { disableClose: true });
    ref.afterClosed().subscribe((created?: Account) => {
      if (created) this.snackBar.open(`Cuenta ${created.mail} habilitada.`, 'Cerrar', { duration: 3000 });
    });
  }

  async deleteAccount(mail: string) {
    if (mail.toLowerCase() === this.me()?.mail?.toLowerCase()) {
      this.snackBar.open('No podés dar de baja tu propia cuenta.', 'Cerrar', { duration: 4000 });
      return;
    }

    const confirmed = await this.viewsSvc.prompt(
      'Dar de baja cuenta',
      `¿Seguro que querés dar de baja la cuenta ${mail}? Esa persona perderá el acceso a Fluxenture.`
    );
    if (!confirmed) return;

    this.deletingMail.set(mail);
    this.usersService.deleteAccount(mail).subscribe({
      next: () => {
        this.deletingMail.set(null);
        this.snackBar.open('Cuenta dada de baja.', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.deletingMail.set(null);
        this.snackBar.open('No se pudo dar de baja la cuenta.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  /** El backend manda LocalDateTime ISO; se corta a mano para no depender del huso. */
  formatDate(value?: string): string {
    if (!value) return '—';
    const [date] = value.split('T');
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  }
}
