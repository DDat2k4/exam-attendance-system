package com.exam.attendance.controller;

import com.exam.attendance.data.entity.ExamRegistration;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.mapper.ExamRegistrationMapper;
import com.exam.attendance.data.request.ExamRegistrationRequest;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.ExamRegistrationService;

import com.exam.attendance.service.UserService;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exam-registrations")
@RequiredArgsConstructor
public class ExamRegistrationController {

    private final ExamRegistrationService service;

    // Lấy theo ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXAM_REGISTRATION_READ')")
    public ResponseEntity<ApiResponse<ExamRegistrationResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Exam registration fetched", service.getById(id)));
    }

    // Lấy danh sách theo exam
    @GetMapping
    @PreAuthorize("hasAnyAuthority('EXAM_REGISTRATION_PAGE')")
    public ResponseEntity<ApiResponse<Page<ExamRegistrationResponse>>> getAll(
            @RequestParam Long examId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

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
    @PreAuthorize("hasAnyAuthority('EXAM_REGISTRATION_CREATE')")
    public ResponseEntity<ApiResponse<Void>> addUser(
            @RequestParam Long userId,
            @RequestParam Long examId
    ) {
        service.addUserToExam(userId, examId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "User added to exam", null));
    }

    // Add nhiều user
    @PostMapping("/batch")
    @PreAuthorize("hasAnyAuthority('EXAM_REGISTRATION_CREATE')")
    public ResponseEntity<ApiResponse<Void>> addUsers(
            @RequestBody ExamRegistrationRequest request
    ) {
        service.addUsersToExam(request.getUserIds(), request.getExamId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Users added to exam", null));
    }

    // Remove user khỏi exam
    @DeleteMapping
    @PreAuthorize("hasAnyAuthority('EXAM_REGISTRATION_DELETE')")
    public ResponseEntity<ApiResponse<Void>> removeUser(
            @RequestParam Long userId,
            @RequestParam Long examId
    ) {

        service.removeUserFromExam(userId, examId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User removed from exam", null)
        );
    }

    // Check user có trong exam không
    @GetMapping("/check")
    @PreAuthorize("hasAnyAuthority('EXAM_REGISTRATION_READ')")
    public ResponseEntity<ApiResponse<Boolean>> check(
            @RequestParam Long userId,
            @RequestParam Long examId
    ) {

        boolean exists = service.isRegistered(userId, examId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Check success", exists)
        );
    }

    @GetMapping("/my-exams")
    @PreAuthorize("hasAnyAuthority('EXAM_REGISTRATION_READ_OWN')")
    public ResponseEntity<ApiResponse<Page<ExamRegistrationResponse>>> getMyExams(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthorized");
        }
        User user = (User) authentication.getPrincipal();
        Pageable pageable = PageRequest.of(page - 1, size);
        Page<ExamRegistrationResponse> result = service
                .getByUserId(user.getId(), pageable)
                .map(ExamRegistrationMapper::toResponse);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "My exams fetched", result)
        );
    }
}