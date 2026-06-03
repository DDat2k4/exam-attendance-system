package com.exam.attendance.controller.identity;

import com.exam.attendance.controller.BaseController;
import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import com.exam.attendance.data.request.VerifyRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.VerifyResponse;
import com.exam.attendance.service.identity.VerificationService;
import com.exam.attendance.security.service.AccessControlService;
import com.exam.attendance.security.SecurityContextUtils;
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

        request.setUserId(SecurityContextUtils.getCurrentUserId());

        var result = verificationService.handleVerify(request);

        return success(result);
    }
}