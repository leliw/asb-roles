import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

// TODO: Replace this with your own data model type
export interface UserItem {
  username: string;
  password: string;
  enabled: boolean;
  authorities: string[];
}

export class UserDataSource {
  apiUrl = environment.apiUrl + '/users';

  constructor(private http: HttpClient) {
  }

  getAll(): Observable<UserItem[]> {
      return this.http.get<UserItem[]>(this.apiUrl);
  }
}