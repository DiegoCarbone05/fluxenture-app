import { Injectable } from '@angular/core';
import { BaseApiService } from '../base-api.service';
import { Doc } from '../../../shared/models/Doc';
import { EmployeeService } from '../employees/employee.service';

@Injectable({
  providedIn: 'root'
})
export class DocsService extends BaseApiService<string> {
  protected override readonly endpoint = this.api + '/docs/';

  constructor(private employeesService: EmployeeService) {
    super();
  }

  getDocs() {
    return this.http.get<Doc[]>(this.endpoint);
  }

  getDoc(id: string) {
    return this.http.get<Doc>(`${this.endpoint}/${id}`);
  }

  saveDoc(doc: Doc) {
    return this.http.post<Doc>(this.endpoint, doc);
  }

  deleteDoc(id: string) {
    return this.http.delete<string>(this.endpoint + id)
  }
}
