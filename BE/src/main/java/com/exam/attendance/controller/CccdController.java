package com.exam.attendance.controller;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.pojo.CCCDInfo;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.repository.UserRepository;
import com.exam.attendance.service.CccdService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cccd")
@RequiredArgsConstructor
public class CccdController extends BaseController {

    private final CccdService cccdService;
    private final UserRepository userRepository;
    private final AccessControlService accessControlService;

    // Verify CCCD
    @PostMapping("/verify")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<CCCDInfo>> verify(
            @RequestBody CCCDInfo cccdInfo,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.CITIZENCARD,
                Action.VERIFY,
                currentUserId,
                currentUserId
        );

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        cccdService.verifyCccd(cccdInfo, user);

        return success(null);
    }

    // Checkin CCCD
    @PostMapping("/checkin")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Object>> checkin(
            @RequestBody CCCDInfo request,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.CITIZENCARD,
                Action.CHECKIN,
                currentUserId,
                currentUserId
        );

        return success(
                cccdService.processCheckin(request)
        );
    }
}