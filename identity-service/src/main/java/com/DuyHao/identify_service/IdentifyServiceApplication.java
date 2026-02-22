package com.DuyHao.identify_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class IdentifyServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(IdentifyServiceApplication.class, args);
	}

}
