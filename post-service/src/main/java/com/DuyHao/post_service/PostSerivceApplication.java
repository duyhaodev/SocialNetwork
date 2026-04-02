package com.DuyHao.post_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication
public class PostSerivceApplication {

	public static void main(String[] args) {
		SpringApplication.run(PostSerivceApplication.class, args);
	}

}
