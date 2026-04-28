package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.ExamSessionMapper;
import com.exam.attendance.data.pojo.ProctorDashboardDTO;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.ExamSessionStartRequest;
import com.exam.attendance.data.request.ProctorDashboardFilterRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.ExamSessionResponse;
import com.exam.attendance.service.ExamSessionService;
import com.exam.attendance.service.ProctorService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam-sessions")
@RequiredArgsConstructor
public class ExamSessionController {

    private final ExamSessionService sessionService;
    private final ProctorService proctorService;
    private final AccessControlService accessControlService;

    // Bắt đầu bài thi
    @PostMapping("/start")
    @PreAuthorize("hasAuthority('STUDENT')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> startExam(
            @RequestBody ExamSessionStartRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.CREATE);

        Long userId = SecurityUtils.getCurrentUserId();

        ExamSessionResponse session = sessionService.startExam(
                userId,
                request.getExamId(),
                request.getDeviceId()
        );

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Exam started", session));
    }

    // Kết thúc bài thi
    @PostMapping("/{sessionId}/end")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'PROCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> endExam(
            @PathVariable Long sessionId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.UPDATE);

        var session = sessionService.getEntity(sessionId);

        accessControlService.checkPermission(
                auth,
                Resource.EXAM_SESSION,
                Action.UPDATE,
                session.getUserId(),
                SecurityUtils.getCurrentUserId()
        );

        sessionService.endExam(sessionId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Exam finished", null)
        );
    }

    // Lấy danh sách bài thi theo id
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'PROCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        var session = sessionService.getEntity(id);

        // owner check cho student
        if (!accessControlService.hasPermission(auth, Resource.EXAM_SESSION, Action.READ)
                || !session.getUserId().equals(SecurityUtils.getCurrentUserId())) {

            // cho phép admin/proctor bypass
            if (!isPrivileged(auth)) {
                throw new AccessDeniedException("Forbidden");
            }
        }

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", session));
    }

    // Lấy toàn bộ
    @GetMapping
    @PreAuthorize("hasAnyAuthority('STUDENT', 'PROCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ExamSessionResponse>>> getAll(
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        var data = sessionService.getAll()
                .stream()
                .map(ExamSessionMapper::toResponse)
                .toList();

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", data)
        );
    }

    // Lấy danh sách bài thi của chính mình
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('STUDENT')")
    public ResponseEntity<ApiResponse<List<ExamSessionResponse>>> getMySessions(
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        Long userId = SecurityUtils.getCurrentUserId();

        var data = sessionService.getByUser(userId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", data)
        );
    }

    // Dashboard
    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Page<ProctorDashboardDTO>>> dashboard(
            @ModelAttribute ProctorDashboardFilterRequest req,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Dashboard",
                        proctorService.getDashboard(req))
        );
    }

    // Gán cờ
    @PostMapping("/{sessionId}/flag")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> flag(
            @PathVariable Long sessionId,
            @RequestParam String reason,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.UPDATE);

        proctorService.flag(sessionId, reason);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Flagged", null)
        );
    }

    // Duyệt bài thi
    @PostMapping("/{sessionId}/approve")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> approve(
            @PathVariable Long sessionId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.UPDATE);

        Long userId = SecurityUtils.getCurrentUserId();

        proctorService.approve(sessionId, userId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Approved", null)
        );
    }

    // Từ chối bài thi
    @PostMapping("/{sessionId}/reject")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> reject(
            @PathVariable Long sessionId,
            @RequestParam String reason,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.UPDATE);

        proctorService.reject(sessionId, reason);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Rejected", null)
        );
    }

    // Lịch sử verify
    @GetMapping("/{sessionId}/verifications")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<?>> history(
            @PathVariable Long sessionId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "History",
                        proctorService.getVerificationHistory(sessionId))
        );
    }

    private boolean isPrivileged(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a ->
                        a.getAuthority().equals("admin")
                                || a.getAuthority().equals("proctor")
                );
    }
}