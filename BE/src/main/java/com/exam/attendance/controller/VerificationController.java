package com.exam.attendance.controller;

import com.exam.attendance.data.request.VerifyRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    @PostMapping
    @PreAuthorize("hasAuthority('VERIFY_IDENTITY')")
    public ResponseEntity<?> verify(@RequestBody VerifyRequest request) {

        var result = verificationService.handleVerify(request);

        return ResponseEntity.ok(new ApiResponse<>(true,"OK", result));
    }
}