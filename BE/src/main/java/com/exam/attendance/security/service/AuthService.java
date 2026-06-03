package com.exam.attendance.security.service;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.entity.UserToken;
import com.exam.attendance.data.dto.UserDTO;
import com.exam.attendance.config.properties.AuthProperties;
import com.exam.attendance.data.request.RegisterRequest;
import com.exam.attendance.data.response.AuthResponse;
import com.exam.attendance.data.response.UserDetailResponse;
import com.exam.attendance.exception.AuthException;
import com.exam.attendance.data.mapper.UserMapper;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.repository.UserTokenRepository;
import com.exam.attendance.service.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

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
    private final LoginAttemptService loginAttemptService;

    // Login
    public AuthResponse login(String usernameOrEmail, String rawPassword) {

        User user = userRepository
                .findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() ->
                        new AuthException("Tài khoản hoặc mật khẩu không chính xác"));

        // Check locked
        if (user.getLockedUntil() != null &&
                user.getLockedUntil().isAfter(LocalDateTime.now())) {

            long remainingMinutes = Math.max(
                    1,
                    ChronoUnit.MINUTES.between(
                            LocalDateTime.now(),
                            user.getLockedUntil()
                    )
            );

            throw new AuthException("Tài khoản đang bị khóa. Vui lòng thử lại sau " + remainingMinutes + " phút");
        }

        if (user.getActive() == 0) {
            throw new AuthException("Tài khoản bạn đang bị khóa!");
        }

        // Check password
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {

            boolean locked = loginAttemptService.handleFailedAttempt(user, usernameOrEmail);

            if (locked) {
                throw new AuthException(
                        "Tài khoản đang bị khóa. Vui lòng thử lại sau "
                                + authProperties.getLockDurationMinutes()
                                + " phút"
                );
            }

            throw new AuthException("Tài khoản hoặc mật khẩu không chính xác");
        }

        // Success
        resetLoginAttempts(user);
        log.info("User {} logged in successfully at {}", usernameOrEmail, user.getLastLogin());

        return generateTokens(user);
    }

    // Refresh token
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
                user.getId(),
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

    // Logout (1 device)
    @Transactional
    public void logout(String refreshToken) {
        UserToken token = userTokenRepository.findByRefreshTokenAndRevokedFalse(refreshToken)
                .orElseThrow(() -> new AuthException("Refresh token not found or already revoked"));

        token.setRevoked(true);
        userTokenRepository.save(token);
    }

    // Logout (All device)
    @Transactional
    public void logoutAll(Long userId) {
        userTokenRepository.revokeAllTokensByUserId(userId);
        log.info("All refresh tokens revoked for userId={}", userId);
    }

    // Đổi mật khẩu
    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthException("User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new AuthException("Old password is incorrect");
        }

        if (newPassword.equals(oldPassword)) {
            throw new AuthException(
                    "New password must be different from old password"
            );
        }

        if (newPassword.length() < 8) {
            throw new AuthException(
                    "Password must contain at least 8 characters"
            );
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // revoke all tokens
        logoutAll(user.getId());
        log.info("Password changed and tokens revoked for user {}", username);
    }

    private void resetLoginAttempts(User user) {
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }

    private AuthResponse generateTokens(User user) {
        // revoke old tokens
        userTokenRepository.revokeAllTokensByUserId(user.getId());

        // Lấy roles + permissions từ UserService
        UserDTO dto = userService.getUserById(user.getId());
        UserDetailResponse userDetail = UserMapper.toResponse(dto);

        String accessToken = jwtService.generateToken(
                user.getId(),
                userDetail.getRoles(),
                userDetail.getPermissions()
        );

        String refreshToken = jwtService.generateRefreshToken(user.getId());

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

    @Transactional
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
