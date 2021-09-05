import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { UserDataSource, UserItem } from './users-datasource';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  dataSource: UserDataSource;
  users: UserItem[] = [];
  
  constructor(private http: HttpClient) {
    this.dataSource = new UserDataSource(http);
  }
  
  ngOnInit(): void {
    this.dataSource.getAll().subscribe(users => this.users = users);
   }
}