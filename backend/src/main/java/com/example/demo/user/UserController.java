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
