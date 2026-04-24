package com.exam.attendance.controller;

import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.request.ExamRequest;
import com.exam.attendance.data.request.ExamRoomRequest;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    // Tạo exam
    @PostMapping
    @PreAuthorize("hasAnyAuthority('EXAM_CREATE')")
    public ResponseEntity<ApiResponse<ExamResponse>> createExam(
            @RequestBody ExamRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthorized");
        }
        User user = (User) authentication.getPrincipal();
        var exam = examService.createExam(request, user.getId());

        return ResponseEntity.status(201)
                .body(new ApiResponse<>(true, "Created", exam));
    }

    // Get all không có rooms, lọc, phân trang
    @GetMapping
    @PreAuthorize("hasAnyAuthority('EXAM_PAGE')")
    public ResponseEntity<ApiResponse<Page<ExamResponse>>> getExams(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Success",
                        examService.getExams(keyword, page, size)
                )
        );
    }

    // Get có rooms
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXAM_READ')")
    public ResponseEntity<ApiResponse<ExamResponse>> getById(@PathVariable Long id) {

        var exam = examService.getExamById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", exam));
    }

    // Cập nhật
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXAM_UPDATE')")
    public ResponseEntity<ApiResponse<ExamResponse>> update(
            @PathVariable Long id,
            @RequestBody ExamRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthorized");
        }
        User user = (User) authentication.getPrincipal();
        var exam = examService.updateExam(id, request, user.getId());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Updated", exam));
    }

    // Xóa
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXAM_DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {

        examService.deleteExam(id);

        return ResponseEntity.ok(new ApiResponse<>(true, "Deleted", null));
    }

    // Tạo room
    @PostMapping("/{examId}/rooms")
    @PreAuthorize("hasAnyAuthority('EXAM_ROOM_CREATE')")
    public ResponseEntity<ApiResponse<ExamRoomResponse>> createRoom(
            @PathVariable Long examId,
            @RequestBody ExamRoomRequest request
    ) {

        var room = examService.createRoom(examId, request);

        return ResponseEntity.status(201)
                .body(new ApiResponse<>(true, "Room created", room));
    }

    // Xóa room
    @DeleteMapping("/rooms/{roomId}")
    @PreAuthorize("hasAnyAuthority('EXAM_ROOM_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(@PathVariable Long roomId) {

        examService.deleteRoom(roomId);

        return ResponseEntity.ok(new ApiResponse<>(true, "Room deleted", null));
    }
}