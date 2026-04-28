package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.VerifyRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.service.VerificationService;
import com.exam.attendance.service.security.AccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;
    private final AccessControlService accessControlService;

    @PostMapping
    public ResponseEntity<?> verify(@RequestBody VerifyRequest request,
                                    Authentication auth) {

        accessControlService.checkPermission(
                auth,
                Resource.IDENTITY_VERIFICATION,
                Action.CREATE
        );

        var result = verificationService.handleVerify(request);

        return ResponseEntity.ok(new ApiResponse<>(true, "OK", result));
    }
}