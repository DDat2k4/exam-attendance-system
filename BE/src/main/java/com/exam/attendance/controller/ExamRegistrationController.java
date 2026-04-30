package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.ExamRegistrationMapper;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.ExamRegistrationRequest;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.ExamRegistrationService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exam-registrations")
@RequiredArgsConstructor
public class ExamRegistrationController extends BaseController {

    private final ExamRegistrationService service;
    private final AccessControlService accessControlService;

    // Lấy theo ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR', 'STUDENT')")
    public ResponseEntity<ApiResponse<ExamRegistrationResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        return success(service.getById(id));
    }

    // Lấy danh sách theo exam
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ExamRegistrationResponse>>> getAll(
            @RequestParam Long examId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        Pageable pageable = PageRequest.of(page - 1, size);

        var result = service
                .getByExam(examId, pageable)
                .map(ExamRegistrationMapper::toResponse);

        return success(result);
    }

    // Add 1 user vào exam
    @PostMapping("/single")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addUser(
            @RequestParam Long userId,
            @RequestParam Long examId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.CREATE);

        service.addUserToExam(userId, examId);

        return created(null);
    }

    // Add nhiều user
    @PostMapping("/batch")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addUsers(
            @RequestBody ExamRegistrationRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.CREATE);

        service.addUsersToExam(request.getUserIds(), request.getExamId());

        return created(null);
    }

    // Remove user khỏi exam
    @DeleteMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeUser(
            @RequestParam Long userId,
            @RequestParam Long examId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.DELETE);

        service.removeUserFromExam(userId, examId);

        return deleted();
    }

    // Check user có trong exam không
    @GetMapping("/check")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Boolean>> check(
            @RequestParam Long userId,
            @RequestParam Long examId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        boolean exists = service.isRegistered(userId, examId);

        return success(exists);
    }

    // My exams
    @GetMapping("/my-exams")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR', 'STUDENT')")
    public ResponseEntity<ApiResponse<Page<ExamRegistrationResponse>>> getMyExams(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        Long userId = SecurityUtils.getCurrentUserId();

        Pageable pageable = PageRequest.of(page - 1, size);

        var result = service
                .getByUserId(userId, pageable)
                .map(ExamRegistrationMapper::toResponse);

        return success(result);
    }
}