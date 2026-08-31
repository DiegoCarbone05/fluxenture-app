import { Injectable, Signal, signal } from '@angular/core';
import { tap } from 'rxjs';
import { BaseApiService } from '../../base-api.service';
import { Account } from '../../../../shared/models/Account';

@Injectable({
  providedIn: 'root'
})
export class UsersService extends BaseApiService<Account> {
  protected override readonly endpoint = this.api + '/user';

  private accounts = signal<Account[]>([]);

  getAccountsSignal(): Signal<Account[]> {
    return this.accounts;
  }

  refreshAccounts() {
    return this.http.get<Account[]>(this.endpoint).pipe(
      tap((accounts) => this.accounts.set(accounts))
    );
  }

  addAccount(account: Pick<Account, 'mail' | 'role'>) {
    return this.http.post<Account>(this.endpoint + '/add', account).pipe(
      tap((created) => this.accounts.update((current) => [...current, created]))
    );
  }

  deleteAccount(mail: string) {
    return this.http.delete<void>(this.endpoint + '/' + encodeURIComponent(mail)).pipe(
      tap(() => this.accounts.update((current) => current.filter((a) => a.mail !== mail)))
    );
  }
}
