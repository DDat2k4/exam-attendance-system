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
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exam-registrations")
@RequiredArgsConstructor
public class ExamRegistrationController {

    private final ExamRegistrationService service;
    private final AccessControlService accessControlService;

    // Lấy theo ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamRegistrationResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Exam registration fetched", service.getById(id)));
    }

    // Lấy danh sách theo exam
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ExamRegistrationResponse>>> getAll(
            @RequestParam Long examId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<ExamRegistrationResponse> result = service
                .getByExam(examId, pageable)
                .map(ExamRegistrationMapper::toResponse);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Exam registrations fetched", result)
        );
    }

    // Add 1 user vào exam
    @PostMapping("/single")
    public ResponseEntity<ApiResponse<Void>> addUser(
            @RequestParam Long userId,
            @RequestParam Long examId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.CREATE);

        service.addUserToExam(userId, examId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "User added to exam", null));
    }

    // Add nhiều user
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<Void>> addUsers(
            @RequestBody ExamRegistrationRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.CREATE);

        service.addUsersToExam(request.getUserIds(), request.getExamId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Users added to exam", null));
    }

    // Remove user khỏi exam
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> removeUser(
            @RequestParam Long userId,
            @RequestParam Long examId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.DELETE);

        service.removeUserFromExam(userId, examId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User removed from exam", null)
        );
    }

    // Check user có trong exam không
    @GetMapping("/check")
    public ResponseEntity<ApiResponse<Boolean>> check(
            @RequestParam Long userId,
            @RequestParam Long examId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        boolean exists = service.isRegistered(userId, examId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Check success", exists)
        );
    }

    @GetMapping("/my-exams")
    public ResponseEntity<ApiResponse<Page<ExamRegistrationResponse>>> getMyExams(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_REGISTRATION, Action.READ);

        Long userId = SecurityUtils.getCurrentUserId();

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<ExamRegistrationResponse> result = service
                .getByUserId(userId, pageable)
                .map(ExamRegistrationMapper::toResponse);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "My exams fetched", result)
        );
    }
}