package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.VerifyRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.VerifyResponse;
import com.exam.attendance.service.identity.VerificationService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerificationController extends BaseController {

    private final VerificationService verificationService;
    private final AccessControlService accessControlService;

    @PostMapping
    public ResponseEntity<ApiResponse<VerifyResponse>> verify(
            @RequestBody VerifyRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.IDENTITY_VERIFICATION,
                Action.CREATE
        );

        request.setUserId(SecurityUtils.getCurrentUserId());

        var result = verificationService.handleVerify(request);

        return success(result);
    }
}