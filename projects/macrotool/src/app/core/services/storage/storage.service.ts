import { Injectable } from '@angular/core';
import { Cd } from '../../../shared/models/Cd.model';
import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService extends BaseApiService<string> {
  protected override readonly endpoint = this.api + '/storage';

  uploadFile(file: File, path: string, name?: string) {
    const formData = new FormData();
    formData.append('file', file, name || file.name);
    formData.append('folderPath', path);
    return this.http.post<string>(this.endpoint + '/upload', formData);
  }

  deleteFile(id:string){
    return this.http.delete<string>(this.endpoint+'/'+id)
  }
}
