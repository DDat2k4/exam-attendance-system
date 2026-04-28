package com.exam.attendance.controller;

import com.exam.attendance.data.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class SsoController extends BaseController {

    @GetMapping("/sso/success")
    public ResponseEntity<ApiResponse<Object>> onSsoSuccess(
            @AuthenticationPrincipal OAuth2User principal
    ) {

        if (principal == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(
                            HttpStatus.UNAUTHORIZED.value(),
                            "Not authenticated",
                            null
                    ));
        }

        return success(principal.getAttributes());
    }

    @GetMapping("/sso/failure")
    public ResponseEntity<ApiResponse<Void>> onSsoFailure() {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse<>(
                        HttpStatus.UNAUTHORIZED.value(),
                        "SSO login failed",
                        null
                ));
    }
}