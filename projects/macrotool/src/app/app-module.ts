import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing-module';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { App } from './app';
import { AddPdf } from './views/dialogs/add-pdf/add-pdf';
import { Prompt } from './views/dialogs/prompt/prompt';
import { SharedModule } from './shared/shared.module';
import { AddEmployee } from './views/dialogs/add-employee/add-employee';
import { DatepickerDialog } from './views/dialogs/datepicker-dialog/datepicker-dialog';
import { CreateEmployeeHistoryDialogComponent } from './views/dialogs/create-employee-history/create-employee-history';

@NgModule({
  declarations: [
    App,
    AddPdf,
    Prompt,
    AddEmployee,
    DatepickerDialog,
    CreateEmployeeHistoryDialogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App]
})
export class AppModule { }
