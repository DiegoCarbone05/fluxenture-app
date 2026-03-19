import { Injectable } from '@angular/core';
import { Cd } from '../../../shared/models/Cd.model';
import { BaseApiService } from '../base-api.service';
import { Doc, EDocType } from '../../../shared/models/Doc';
import { EmployeeService } from '../employees/employee.service';
import { Employee } from '../../../shared/models/Employee';

@Injectable({
  providedIn: 'root'
})
export class StorageService extends BaseApiService<string> {
  protected override readonly endpoint = this.api + '/storage';

  constructor(private employeesService: EmployeeService) {
    super();
  }

  uploadFileLPO(file: File, path: string, name?: string) {
    const formData = new FormData();
    formData.append('file', file, name || file.name);
    formData.append('folderPath', path);
    return this.http.post<string>(this.endpoint + '/upload', formData);
  }

  /**
   * Funcion hecha solo para subir Docs y que sean enviados a LPO
   */
  uploadDoc(file: File, employee: Employee, docType: EDocType) {
    const formData = new FormData();

    const folderPath = `lpo/[${employee?.employeeID}] ${employee?.name}`

    formData.append('file', file, file.name);
    formData.append('folderPath', folderPath);
    return this.http.post<string>(this.endpoint + '/upload', formData);
  }

  uploadFile(file: File, path: string, name?: string) {
    const formData = new FormData();
    formData.append('file', file, name || file.name);
    formData.append('folderPath', path);
    return this.http.post<string>(this.endpoint + '/upload', formData);
  }

  deleteFile(id: string) {
    return this.http.delete<string>(this.endpoint + '/' + id)
  }

  downloadFile(id: string) {
    return this.http.get(this.endpoint + '/download/' + id, { responseType: 'blob' })
  }
}
