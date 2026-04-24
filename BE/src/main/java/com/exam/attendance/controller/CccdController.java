package com.exam.attendance.controller;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.pojo.CCCDInfo;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.service.CccdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cccd")
@RequiredArgsConstructor
public class CccdController {

    private final CccdService cccdService;

    @PostMapping("/verify")
    @PreAuthorize("hasAnyAuthority('CCCD_VERIFY')")
    public ResponseEntity<ApiResponse<CCCDInfo>> verify(
            @RequestBody CCCDInfo cccdInfo,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthorized");
        }
        User user = (User) authentication.getPrincipal();
        String last9Id1 = user.getUserProfile().getCitizenId().substring(Math.max(0, user.getUserProfile().getCitizenId().length() - 6));
        String can = last9Id1;
        cccdService.verifyCccd(cccdInfo, user);
        return ResponseEntity.ok(new ApiResponse<>(true, "CCCD verified successfully", cccdInfo)
        );
    }

    @PostMapping("/checkin")
    @PreAuthorize("hasAnyAuthority('CCCD_CHECKIN')")
    public ResponseEntity<ApiResponse<?>> checkin(
            @RequestBody CCCDInfo request
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Checkin thành công",
                        cccdService.processCheckin(request))
        );
    }
}