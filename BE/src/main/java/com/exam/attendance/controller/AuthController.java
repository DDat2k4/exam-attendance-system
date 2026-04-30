package com.exam.attendance.controller;

import com.exam.attendance.data.request.AuthRequest;
import com.exam.attendance.data.request.RegisterRequest;
import com.exam.attendance.data.request.RefreshRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.AuthResponse;
import com.exam.attendance.service.security.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController extends BaseController {

    private final AuthService authService;

    // Register
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@RequestBody RegisterRequest request) {

        authService.register(request);

        return created(null);
    }

    // Login
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody AuthRequest request) {

        AuthResponse authResponse = authService.login(
                request.getUsernameOrEmail(),
                request.getPassword()
        );

        return success(authResponse);
    }

    // Refresh token
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestBody RefreshRequest request) {

        AuthResponse authResponse = authService.refreshToken(request.getRefreshToken());

        return success(authResponse);
    }

    // Logout
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody RefreshRequest request) {

        authService.logout(request.getRefreshToken());

        return success(null);
    }

    // Logout all devices
    @PostMapping("/logout-all/{userId}")
    public ResponseEntity<ApiResponse<Void>> logoutAll(@PathVariable Long userId) {

        authService.logoutAll(userId);

        return success(null);
    }

    // Change password
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @RequestParam String oldPassword,
            @RequestParam String newPassword
    ) {

        String username = authentication.getName();

        authService.changePassword(username, oldPassword, newPassword);

        return success(null);
    }
}