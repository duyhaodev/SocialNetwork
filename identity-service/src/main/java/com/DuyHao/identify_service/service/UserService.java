package com.DuyHao.identify_service.service;

import com.DuyHao.identify_service.dto.request.ProfileCreationRequest;
import com.DuyHao.identify_service.dto.request.UserCreationRequest;
import com.DuyHao.identify_service.dto.request.UserUpdateRequest;
import com.DuyHao.identify_service.dto.response.UserResponse;
import com.DuyHao.identify_service.entity.User;
import com.DuyHao.identify_service.entity.Role;
import com.DuyHao.identify_service.exception.AppException;
import com.DuyHao.identify_service.exception.ErrorCode;
import com.DuyHao.identify_service.mapper.ProfileMapper;
import com.DuyHao.identify_service.mapper.UserMapper;
import com.DuyHao.identify_service.repository.RoleRepository;
import com.DuyHao.identify_service.repository.UserRepository;
import com.DuyHao.identify_service.repository.httpClient.ProfileClient;
import com.DuyHao.identify_service.event.UserRegistrationEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    RoleRepository roleRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    ProfileClient profileClient;
    ProfileMapper profileMapper;
    EmailService emailService;
    ApplicationEventPublisher eventPublisher;

    public UserResponse createUser(UserCreationRequest request) {
        String email = request.getEmail();
        String derivedUserName = email.substring(0, email.indexOf("@"));

        if (userRepository.existsByEmail(email) || userRepository.existsByUsername(derivedUserName)) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        User user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setUsername(derivedUserName);
        user.setFullName(request.getFullName());
        user.setEnabled(false);

        user = userRepository.save(user);

        // Publish registration event asynchronously
        eventPublisher.publishEvent(new UserRegistrationEvent(user));

        return userMapper.toUserResponse(user);
    }

    public UserResponse verifyUser(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (user.isEnabled()) {
            return userMapper.toUserResponse(user);
        }

        // Check if blocked (Max attempts)
        int attempts = user.getVerification_attempts() == null ? 0 : user.getVerification_attempts();
        if (attempts >= 5) {
            user.setVerification_code(null);
            userRepository.save(user);
            throw new AppException(ErrorCode.MAX_OTP_ATTEMPTS);
        }

        // Check expiry
        if (user.getOtp_expiry_time() != null && LocalDateTime.now().isAfter(user.getOtp_expiry_time())) {
            user.setVerification_code(null);
            userRepository.save(user);
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        if (code != null && code.equals(user.getVerification_code())) {
            user.setEnabled(true);
            user.setVerification_code(null);
            user.setVerification_attempts(0);

            User savedUser = userRepository.save(user);

            // Create profile after successful verification
            var profileRequest = ProfileCreationRequest.builder()
                    .userId(savedUser.getId())
                    .username(savedUser.getUsername())
                    .fullName(savedUser.getFullName())
                    .build();

            try {
                profileClient.createProfile(profileRequest);
            } catch (Exception e) {
                log.error("Failed to create profile for user {}: {}", savedUser.getId(), e.getMessage());
            }

            return userMapper.toUserResponse(savedUser);
        } else {
            // Increment fail attempts
            user.setVerification_attempts(attempts + 1);
            userRepository.save(user);
            throw new AppException(ErrorCode.INVALID_OTP_KEY);
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> getUser() {
        return userRepository.findAll().stream().map(userMapper::toUserResponse).toList();
    }

    @PostAuthorize("returnObject.username == authentication.name")
    public UserResponse getUser(String id) {
        return userMapper.toUserResponse(userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found")));
    }

    public UserResponse updateUser(String userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        userMapper.updateUser(user, request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        var roles = roleRepository.findAllById(request.getRoles());

        user.setRoles(new HashSet<>(roles));

        return userMapper.toUserResponse(userRepository.save(user));
    }

    public void deleteUser(String userId) {
        userRepository.deleteById(userId);
    }

    public UserResponse getMyInfo() {
        var context = SecurityContextHolder.getContext();
        String name = context.getAuthentication().getName();

        User user = userRepository.findByUsername(name).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return userMapper.toUserResponse(user);
    }
}
