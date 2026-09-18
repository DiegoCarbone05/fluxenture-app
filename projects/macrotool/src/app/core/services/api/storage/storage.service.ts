import { Injectable } from '@angular/core';
import { Cd } from '../../../../shared/models/Cd.model';
import { BaseApiService } from '../../base-api.service';
import { Doc } from '../../../../shared/models/Doc';
import { EmployeeService } from '../employees/employee.service';
import { EmployeeDTO } from '../../../../shared/models/EmployeeDTO';
import { fullNameOf } from '../../../../shared/models/Employee';

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
   * Funcion hecha solo para subir Docs y que sean enviados a LPO. `employee` es opcional:
   * un documento subido desde el explorador de Documentos puede no tener dueño todavia,
   * en ese caso cae en una carpeta de staging comun en vez de la carpeta LPO del empleado.
   */
  uploadDoc(file: File, employee?: EmployeeDTO, docType?: string) {
    const formData = new FormData();

    // Se usa el nombre completo (APELLIDO NOMBRES) y no employee.name: despues del
    // split, name son solo los nombres de pila, y armar la ruta con eso apuntaria a
    // una carpeta distinta de la que el empleado ya tiene creada en Drive.
    const folderPath = employee
      ? `lpo/[${employee.employeeId}] ${fullNameOf(employee)}`
      : 'lpo/sin-asignar';

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
