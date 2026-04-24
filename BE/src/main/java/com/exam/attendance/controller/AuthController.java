package com.exam.attendance.controller;

import com.exam.attendance.data.request.AuthRequest;
import com.exam.attendance.data.request.RegisterRequest;
import com.exam.attendance.data.request.RefreshRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.AuthResponse;
import com.exam.attendance.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Register
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@RequestBody RegisterRequest request) {

        authService.register(request);

        return ResponseEntity
                .status(201)
                .body(new ApiResponse<>(true, "User registered successfully!", null));
    }

    // Login
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody AuthRequest request) {

        AuthResponse authResponse = authService.login(
                request.getUsername(),
                request.getPassword()
        );

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Login successful", authResponse)
        );
    }

    // Refresh token
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestBody RefreshRequest request) {

        AuthResponse authResponse = authService.refreshToken(request.getRefreshToken());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Token refreshed successfully", authResponse)
        );
    }

    // Đăng xuất
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody RefreshRequest request) {

        authService.logout(request.getRefreshToken());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Logged out successfully!", null)
        );
    }

    // Đăng xuất tất cả thết bị
    @PostMapping("/logout-all/{userId}")
    public ResponseEntity<ApiResponse<Void>> logoutAll(@PathVariable Long userId) {

        authService.logoutAll(userId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Logged out from all devices successfully!", null)
        );
    }

    // Đổi mật khẩu
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @RequestParam String oldPassword,
            @RequestParam String newPassword
    ) {

        String username = authentication.getName();

        authService.changePassword(username, oldPassword, newPassword);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Password changed successfully. Please login again.", null)
        );
    }
}