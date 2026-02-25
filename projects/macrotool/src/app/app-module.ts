import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { App } from './app';
import { AddPdf } from './views/dialogs/add-pdf/add-pdf';
import { Prompt } from './views/dialogs/prompt/prompt';
import { SharedModule } from './shared/shared.module';
import { AddEmployee } from './views/dialogs/add-employee/add-employee';

@NgModule({
  declarations: [
    App,
    AddPdf,
    Prompt,
    AddEmployee,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SharedModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App]
})
export class AppModule { }
