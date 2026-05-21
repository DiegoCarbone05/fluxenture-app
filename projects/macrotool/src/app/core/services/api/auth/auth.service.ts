import { Injectable, Signal, signal } from '@angular/core';
import { BaseApiService } from '../../base-api.service';
import { LoginDTO } from '../../../../shared/models/LoginDTO';
import { tap } from 'rxjs';
import { UserDto } from '../../../../shared/models/UserDto';
import { catchError, map, Observable, of } from 'rxjs';
import { Router } from '@angular/router';

const TOKEN_KEY = 'flux_token';

export interface LoginResponse {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseApiService<LoginDTO> {
  protected override readonly endpoint = this.api + '/auth';
  private user = signal<UserDto | null>(null);

  constructor(private router: Router) {
    super();
  }

  getUserSignal(): Signal<UserDto | null> {
    return this.user;
  }

  saveUserInSignal() {
    this.getUser().subscribe(user => {
      this.user.set(user);
    });
  }

  login(credentials: LoginDTO) {
    return this.http.post<LoginResponse>(this.endpoint + '/login', credentials).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    this.user.set(null);
  }

  getUser(): Observable<UserDto> {
    return this.http.get<UserDto>(this.endpoint + '/me');
  }

  /**
   * Verifies current session. Returns true if valid, false otherwise.
   * Caller is responsible for navigation.
   */
  verifySession(): Observable<boolean> {
    return this.getUser().pipe(
      map(user => {
        return user !== null;
      }),
      catchError(() => of(false))
    );
  }
}
