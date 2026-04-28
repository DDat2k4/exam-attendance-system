package com.exam.attendance.service.security;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserToken;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.request.AuthProperties;
import com.exam.attendance.data.request.RegisterRequest;
import com.exam.attendance.data.response.AuthResponse;
import com.exam.attendance.data.response.UserDetailResponse;
import com.exam.attendance.exception.AuthException;
import com.exam.attendance.data.mapper.UserMapper;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserTokenRepository;
import com.exam.attendance.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final UserTokenRepository userTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties authProperties;
    private final UserService userService;

    // LOGIN
    public AuthResponse login(String username, String rawPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException("User not found"));

        // Check locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new AuthException("Account is locked until " + user.getLockedUntil());
        }

        // Check password
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            handleFailedAttempt(user, username);
            throw new AuthException("Invalid credentials");
        }

        // Success
        resetLoginAttempts(user);
        log.info("User {} logged in successfully at {}", username, user.getLastLogin());
        return generateTokens(user);
    }

    // REFRESH TOKEN
    public AuthResponse refreshToken(String refreshToken) {
        UserToken token = userTokenRepository.findByRefreshTokenAndRevokedFalse(refreshToken)
                .orElseThrow(() -> new AuthException("Refresh token not found or revoked"));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AuthException("Refresh token expired");
        }
        Long userId = token.getUser().getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthException("User not found"));

        log.info("Refresh token used for user {}", user.getUsername());

        // Lấy roles + permissions từ UserService
        UserDTO dto = userService.getUserById(user.getId());
        UserDetailResponse userDetail = UserMapper.toResponse(dto);

        String newAccessToken = jwtService.generateToken(
                user.getUsername(),
                userDetail.getRoles(),
                userDetail.getPermissions()
        );

        return AuthResponse.builder()
                .userId(userId)
                .userName(user.getUsername())
                .email(userDetail.getEmail())
                .provider("local")
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .roles(userDetail.getRoles())
                .permissions(userDetail.getPermissions())
                .build();
    }

    // LOGOUT (1 device)
    public void logout(String refreshToken) {
        UserToken token = userTokenRepository.findByRefreshTokenAndRevokedFalse(refreshToken)
                .orElseThrow(() -> new AuthException("Refresh token not found or already revoked"));

        token.setRevoked(true);
        userTokenRepository.save(token);
    }

    // LOGOUT ALL DEVICES
    public void logoutAll(Long userId) {
        userTokenRepository.findActiveTokensByUserId(userId)
                .forEach(token -> {
                    token.setRevoked(true);
                    userTokenRepository.save(token);
                });
        log.info("All refresh tokens revoked for userId={}", userId);
    }

    // CHANGE PASSWORD
    public void changePassword(String username, String oldPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException("User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new AuthException("Old password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // revoke all tokens
        logoutAll(user.getId());
        log.info("Password changed and tokens revoked for user {}", username);
    }


    private void handleFailedAttempt(User user, String username) {
        user.setFailedAttempts(user.getFailedAttempts() + 1);

        if (user.getFailedAttempts() >= authProperties.getMaxFailedAttempts()) {
            user.setLockedUntil(LocalDateTime.now()
                    .plus(authProperties.getLockDurationMinutes(), ChronoUnit.MINUTES));
            user.setFailedAttempts(0);
            log.warn("User {} locked until {}", username, user.getLockedUntil());
        }

        userRepository.save(user);
        log.warn("Login failed for user {}, attempts={}", username, user.getFailedAttempts());
    }

    private void resetLoginAttempts(User user) {
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }

    private AuthResponse generateTokens(User user) {
        // revoke old tokens
        userTokenRepository.findActiveTokensByUserId(user.getId())
                .forEach(token -> {
                    token.setRevoked(true);
                    userTokenRepository.save(token);
                });

        // Lấy roles + permissions từ UserService
        UserDTO dto = userService.getUserById(user.getId());
        UserDetailResponse userDetail = UserMapper.toResponse(dto);

        String accessToken = jwtService.generateToken(
                user.getUsername(),
                userDetail.getRoles(),
                userDetail.getPermissions()
        );

        String refreshToken = jwtService.generateRefreshToken(user.getUsername());

        UserToken userToken = new UserToken();
        userToken.setUser(user);
        userToken.setRefreshToken(refreshToken);
        userToken.setCreatedAt(LocalDateTime.now());
        userToken.setExpiresAt(LocalDateTime.now().plusDays(7));
        userToken.setRevoked(false);
        userTokenRepository.save(userToken);

        return AuthResponse.builder()
                .userId(user.getId())
                .userName(user.getUsername())
                .email(userDetail.getEmail())
                .provider("local")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .roles(userDetail.getRoles())
                .permissions(userDetail.getPermissions())
                .build();
    }

    public void register(RegisterRequest request) {

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new AuthException("Username already exists");
        }

        User user = new User();
        user.setUid(java.util.UUID.randomUUID());
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive((short) 1);
        user.setFailedAttempts(0);
        user.setCreatedAt(LocalDateTime.now());

        userRepository.save(user);

        log.info("New user registered: {}", user.getUsername());
    }
}
