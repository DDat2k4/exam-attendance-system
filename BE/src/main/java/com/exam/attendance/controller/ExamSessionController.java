package com.exam.attendance.controller;

import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.mapper.ExamSessionMapper;
import com.exam.attendance.data.pojo.ProctorDashboardDTO;
import com.exam.attendance.data.request.ExamSessionStartRequest;
import com.exam.attendance.data.request.ProctorDashboardFilterRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.ExamSessionResponse;
import com.exam.attendance.service.ExamSessionService;
import com.exam.attendance.service.ProctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
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

    // START EXAM (STUDENT)
    @PostMapping("/start")
    @PreAuthorize("hasAuthority('EXAM_SESSION_START')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> startExam(
            @RequestBody ExamSessionStartRequest request,
            Authentication authentication
    ) {

        User user = (User) authentication.getPrincipal();

        ExamSessionResponse session = sessionService.startExam(
                user.getId(),
                request.getExamId(),
                request.getDeviceId()
        );

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Exam started", session));
    }


    // END EXAM
    @PostMapping("/{sessionId}/end")
    @PreAuthorize("hasAuthority('EXAM_SESSION_END')")
    public ResponseEntity<ApiResponse<Void>> endExam(
            @PathVariable Long sessionId
    ) {

        sessionService.endExam(sessionId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Exam finished", null)
        );
    }

    // GET BY ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('EXAM_SESSION_VIEW')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> getById(
            @PathVariable Long id,
            Authentication authentication
    ) {

        User user = (User) authentication.getPrincipal();
        ExamSessionResponse session = sessionService.getExamSessionById(id);

        if (isStudent(authentication)
                && !session.getUserId().equals(user.getId())) {
            throw new RuntimeException("Forbidden");
        }

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", session));
    }

    // GET ALL
    @GetMapping
    @PreAuthorize("hasAuthority('EXAM_SESSION_LIST')")
    public ResponseEntity<ApiResponse<List<ExamSessionResponse>>> getAll() {

        var data = sessionService.getAll()
                .stream()
                .map(ExamSessionMapper::toResponse)
                .toList();

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", data)
        );
    }

    // MY SESSIONS
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('EXAM_SESSION_VIEW_OWN')")
    public ResponseEntity<ApiResponse<List<ExamSessionResponse>>> getMySessions(
            Authentication authentication
    ) {

        User user = (User) authentication.getPrincipal();

        var data = sessionService.getByUser(user.getId());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", data)
        );
    }

    // DASHBOARD (PROCTOR)
    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('EXAM_SESSION_DASHBOARD')")
    public ResponseEntity<ApiResponse<Page<ProctorDashboardDTO>>> dashboard(
            @ModelAttribute ProctorDashboardFilterRequest req
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Dashboard",
                        proctorService.getDashboard(req))
        );
    }

    // FLAG
    @PostMapping("/{sessionId}/flag")
    @PreAuthorize("hasAuthority('EXAM_SESSION_FLAG')")
    public ResponseEntity<ApiResponse<Void>> flag(
            @PathVariable Long sessionId,
            @RequestParam String reason
    ) {

        proctorService.flag(sessionId, reason);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Flagged", null)
        );
    }

    // APPROVE
    @PostMapping("/{sessionId}/approve")
    @PreAuthorize("hasAuthority('EXAM_SESSION_APPROVE')")
    public ResponseEntity<ApiResponse<Void>> approve(
            @PathVariable Long sessionId,
            Authentication authentication
    ) {

        User user = (User) authentication.getPrincipal();

        proctorService.approve(sessionId, user.getId());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Approved", null)
        );
    }

    // REJECT
    @PostMapping("/{sessionId}/reject")
    @PreAuthorize("hasAuthority('EXAM_SESSION_REJECT')")
    public ResponseEntity<ApiResponse<Void>> reject(
            @PathVariable Long sessionId,
            @RequestParam String reason
    ) {

        proctorService.reject(sessionId, reason);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Rejected", null)
        );
    }

    // HISTORY VERIFY
    @GetMapping("/{sessionId}/verifications")
    @PreAuthorize("hasAuthority('EXAM_SESSION_VERIFY_HISTORY')")
    public ResponseEntity<ApiResponse<?>> history(
            @PathVariable Long sessionId
    ) {

        return ResponseEntity.ok(
                new ApiResponse<>(true, "History",
                        proctorService.getVerificationHistory(sessionId))
        );
    }

    private boolean isStudent(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
    }
}