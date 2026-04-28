package com.exam.attendance.controller;

import com.exam.attendance.data.entity.IdentityVerification;
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
public class ExamSessionController extends BaseController {

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

        return created(
                sessionService.startExam(
                        userId,
                        request.getExamId(),
                        request.getDeviceId()
                )
        );
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

        return updated(null);
    }

    // Lấy theo id
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('STUDENT', 'PROCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        var session = sessionService.getEntity(id);

        Long currentUserId = SecurityUtils.getCurrentUserId();

        boolean isOwner = session.getUserId().equals(currentUserId);
        boolean isPrivileged = isPrivileged(auth);

        if (!isOwner && !isPrivileged) {
            throw new AccessDeniedException("Forbidden");
        }

        return success(session);
    }

    // Lấy tất cả
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

        return success(data);
    }

    // My sessions
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('STUDENT')")
    public ResponseEntity<ApiResponse<List<ExamSessionResponse>>> getMySessions(
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        Long userId = SecurityUtils.getCurrentUserId();

        return success(sessionService.getByUser(userId));
    }

    // Dashboard
    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Page<ProctorDashboardDTO>>> dashboard(
            @ModelAttribute ProctorDashboardFilterRequest req,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        return success(proctorService.getDashboard(req));
    }

    // Flag
    @PostMapping("/{sessionId}/flag")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> flag(
            @PathVariable Long sessionId,
            @RequestParam String reason,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.UPDATE);

        proctorService.flag(sessionId, reason);

        return updated(null);
    }

    // Approve
    @PostMapping("/{sessionId}/approve")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> approve(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.UPDATE);

        proctorService.approve(
                sessionId,
                SecurityUtils.getCurrentUserId()
        );

        return updated(null);
    }

    // Reject
    @PostMapping("/{sessionId}/reject")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> reject(
            @PathVariable Long sessionId,
            @RequestParam String reason,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.UPDATE);

        proctorService.reject(sessionId, reason);

        return updated(null);
    }

    // History
    @GetMapping("/{sessionId}/verifications")
    @PreAuthorize("hasAuthority('PROCTOR')")
    public ResponseEntity<ApiResponse<List<IdentityVerification>>> history(
            @PathVariable Long sessionId,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_SESSION, Action.READ);

        return success(proctorService.getVerificationHistory(sessionId));
    }

    private boolean isPrivileged(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a ->
                        a.getAuthority().equals("ADMIN")
                                || a.getAuthority().equals("PROCTOR")
                );
    }
}