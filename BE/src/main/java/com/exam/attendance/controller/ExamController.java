package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.ExamRequest;
import com.exam.attendance.data.request.ExamRoomRequest;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.ExamService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;
    private final AccessControlService accessControlService;

    // Tạo exam
    @PostMapping
    public ResponseEntity<ApiResponse<ExamResponse>> createExam(
            @RequestBody ExamRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM, Action.CREATE);

        Long userId = SecurityUtils.getCurrentUserId();

        var exam = examService.createExam(request, userId);

        return ResponseEntity.status(201)
                .body(new ApiResponse<>(true, "Created", exam));
    }

    // Phân trang exam
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ExamResponse>>> getExams(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM, Action.READ);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success",
                        examService.getExams(keyword, page, size))
        );
    }

    // Tìm exam theo id
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM, Action.READ);

        var exam = examService.getExamById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Success", exam));
    }

    // Cập nhật exam theo id
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamResponse>> update(
            @PathVariable Long id,
            @RequestBody ExamRequest request,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        var exam = examService.getExamEntity(id);

        accessControlService.checkPermission(
                auth,
                Resource.EXAM,
                Action.UPDATE,
                exam.getCreatedById(),
                currentUserId
        );

        var updated = examService.updateExam(id, request, currentUserId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Updated", updated));
    }

    // Xóa exam theo id
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        var exam = examService.getExamEntity(id);

        accessControlService.checkPermission(
                auth,
                Resource.EXAM,
                Action.DELETE,
                exam.getCreatedById(),
                currentUserId
        );

        examService.deleteExam(id);

        return ResponseEntity.ok(new ApiResponse<>(true, "Deleted", null));
    }

    // Tạo room theo examId
    @PostMapping("/{examId}/rooms")
    public ResponseEntity<ApiResponse<ExamRoomResponse>> createRoom(
            @PathVariable Long examId,
            @RequestBody ExamRoomRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.CREATE);

        var room = examService.createRoom(examId, request);

        return ResponseEntity.status(201)
                .body(new ApiResponse<>(true, "Room created", room));
    }

    // Xóa room
    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable Long roomId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.DELETE);

        examService.deleteRoom(roomId);

        return ResponseEntity.ok(new ApiResponse<>(true, "Room deleted", null));
    }
}