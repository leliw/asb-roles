# Angular - Spring Boot - Roles Authorization

This project extends the previous project by authorization based on roles.

## Environment configuration

Download code and extract to a diffrent folder.

```bash
$ curl -L https://github.com/leliw/asb-basic/archive/refs/heads/main.zip -o main.zip
$ unzip main.zip
$ mv asb-basic-main asb-roles
$ cd asb-roles
```

If you use eclipse as Java IDE, import backend folder as Maven project.

## Backend - UserDetailsManager

At the beginnig we define UserDetailsManager in BackendApplication class where roles are stored. 

```java
	@Bean
	UserDetailsManager users(DataSource dataSource) {
	    UserDetails user = User.builder()
	        .username("user")
	        .password("{bcrypt}$2a$10$GRLdNijSQMUvl/au9ofL.eDwmoohzzS7.rmNSJZ.0FxO/BTk76klW")
	        .roles("USER")
	        .build();
	    UserDetails admin = User.builder()
	        .username("admin")
	        .password("{bcrypt}$2a$10$GRLdNijSQMUvl/au9ofL.eDwmoohzzS7.rmNSJZ.0FxO/BTk76klW")
	        .roles("USER", "ADMIN")
	        .build();
	    JdbcUserDetailsManager users = new JdbcUserDetailsManager(dataSource);
	    users.createUser(user);
	    users.createUser(admin);
	    return users;
	}
```
Users are stored in memory in H2 database.

```java
	@Bean
	DataSource dataSource() {
	    return new EmbeddedDatabaseBuilder()
	        .setType(EmbeddedDatabaseType.H2)
	        .addScript("classpath:org/springframework/security/core/userdetails/jdbc/users.ddl")
	        .build();
	}
```
Add proper libraries in pom.xml file.

```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-jpa</artifactId>
		</dependency>
		<dependency>
			<groupId>com.h2database</groupId>
			<artifactId>h2</artifactId>
			<scope>runtime</scope>
		</dependency>
```

Now run (docker with nginx) backend and frontend. Login in via [fronted](http://localhost) as user: **admin**, password: **password** and then check http://localhost/sso/user. There is array "authorities" where defined roles exists. You can logout and login again as user: **user**, password: **password** and check user data again.

## Frontend - check roles

Modify app.service.ts to store roles and check if given role is stored. Strange map() and substr(5) removes "ROLE_" prefix returned by backend so this prefix isn't used in frontend.

```typescript
    authenticate(credentials, callback) {
        const headers = new HttpHeaders(credentials ? {
            authorization: 'Basic ' + btoa(credentials.username + ':' + credentials.password)
        } : {});

        this.http.get(environment.ssoUrl + '/user', { headers: headers }).subscribe(response => {
            if (response && response['name']) {
                this.authenticated = true;
                this.roles = response['principal'].authorities.map((element) => {
                    return element.authority.substr(5); 
                });                
            } else {
                this.authenticated = false;
                this.roles = null;
            }
            console.log(this.authenticated);
            console.log(this.roles);
            return callback && callback();
        });
    }

    hasRole(role: String) {
        return this.roles &&  this.roles.indexOf(role) !== -1;
    }
```
Create component for administrators.

```bash
$ ng generate component users
```

Add router link in menu to browse users available only by administrators (nav.comopnent.html).

```html
    <mat-nav-list>
      <a mat-list-item routerLink="/home">Home</a>
      <a mat-list-item href="#" *ngIf="appService.authenticated">Link</a>
      <a mat-list-item routerLink="/users" *ngIf="appService.hasRole('ADMIN')">Users</a>
    </mat-nav-list>
```

Roles can be also verified in routing module (app-routing-module.ts).

```typescript
const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'users', component: UsersComponent,  canActivate: [AppService],  data: { role: "ADMIN" } }
];
```
AppService has to implement CanActivate interface. If user hasn't required role is redirected to main page.

```typescript
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if (this.roles) {
            if (route.data.role && this.hasRole(route.data.role)) {
                return true;
            } else {
                this.router.navigate(['/']);
                return false;
            }
        }
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
```
## Backend - user

Roles has to be checked also at backend side. So let's add standard entity (User.java), repository (UserRepository.java) and controller (UserController.java).

```java
package com.example.demo.user;

import java.util.Set;

import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.Table;

@Entity
@Table(name = "users")
public class User {
	@Id
	@Column(length = 50)
	public String username;
	@Column(length = 500)
	public String password;
	public Boolean enabled;
	@ElementCollection
	@CollectionTable(name = "authorities", joinColumns = @JoinColumn(name="username"))
	@Column(name = "authority")
	public Set<String> authorities;
}
```
```java
package com.example.demo.user;

import org.springframework.data.repository.CrudRepository;

public interface UserRepository extends CrudRepository<User, String>{

}
```
```java
package com.example.demo.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {
	@Autowired
	private UserRepository repository;
	
	@GetMapping("/api/users")
	public @ResponseBody Iterable<User> getAll() {
		return repository.findAll();
	}
}
```

Now you can check: http://localhost/api/users. Sadly for the moment it's availabe without login.

## Frontend - users component

Let's fulfill created before users component to show received data.

### users-datasource.ts
```typescript
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
```
### users.component.ts
```typescript
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
```

### users.component.html
```html
<h1 class="mat-h1">Users</h1>
<ul>
    <li *ngFor="let user of users">
        <span>username: {{user.username}}</span>; 
        <span>enabled: {{user.enabled}}</span>; 
        <span>roles: {{user.authorities}}</span>
    </li>
</ul>
```

## Backend - check roles

At first, all api ("/api/**") methods should be available only for authenticated users.

```java
		protected void configure(HttpSecurity http) throws Exception {
			http.httpBasic()
			.and()
				.logout()
				.logoutUrl("/sso/logout")
			.and()
				.authorizeRequests().antMatchers("/api/**").authenticated()
				.anyRequest().permitAll()
			.and()
				.csrf()
				.ignoringAntMatchers ("/login","/logout")
				.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
		}
```

Now http://localhost/api/users can call users and administrators. Then add required role (hasRole("ADMIN")) to paths "/api/users" and "/api/users/**".

```java
		protected void configure(HttpSecurity http) throws Exception {
			http.httpBasic()
			.and()
				.logout()
				.logoutUrl("/sso/logout")
			.and()
				.authorizeRequests()
					.antMatchers("/api/users", "/api/users/**").hasRole("ADMIN")
					.antMatchers("/api/**").authenticated()
				.anyRequest().permitAll()
			.and()
				.csrf()
				.ignoringAntMatchers ("/login","/logout")
				.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
		}
```
References:
1. https://jasonwatmore.com/post/2020/09/09/angular-10-role-based-authorization-tutorial-with-example
2. https://www.baeldung.com/spring-security-check-user-role
3. https://www.baeldung.com/spring-security-method-security
4. https://www.baeldung.com/role-and-privilege-for-spring-security-registration
5. https://docs.spring.io/spring-security/site/docs/4.2.0.M1/reference/html/jc.html 
6. https://developer.okta.com/blog/2019/06/20/spring-preauthorize

