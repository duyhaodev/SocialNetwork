package com.DuyHao.identify_service.event;

import com.DuyHao.identify_service.entity.User;
import com.DuyHao.identify_service.repository.UserRepository;
import com.DuyHao.identify_service.service.EmailService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserRegistrationListener {
    UserRepository userRepository;
    EmailService emailService;

    @Async
    @EventListener
    public void handleUserRegistrationEvent(UserRegistrationEvent event) {
        User user = event.getUser();
        log.info("Processing user registration event for user: {}", user.getEmail());

        // Generate OTP
        String code = String.valueOf((int) ((Math.random() * 900000) + 100000));
        
        // Update User with OTP
        user.setVerification_code(code);
        user.setVerification_attempts(0);
        user.setOtp_expiry_time(LocalDateTime.now().plusMinutes(5));
        
        userRepository.save(user);

        // Send Email
        log.info("Sending verification email to: {}", user.getEmail());
        emailService.sendVerificationEmail(user.getEmail(), code);
    }
}
