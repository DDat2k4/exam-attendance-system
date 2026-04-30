package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.ExamRequest;
import com.exam.attendance.data.request.ExamRoomRequest;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.ExamService;
import com.exam.attendance.service.excel.ImportExamService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController extends BaseController {

    private final ExamService examService;
    private final AccessControlService accessControlService;
    private final ImportExamService importExamService;

    // Tạo exam
    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<ExamResponse>> createExam(
            @RequestBody ExamRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM, Action.CREATE);

        Long userId = SecurityUtils.getCurrentUserId();

        var exam = examService.createExam(request, userId);

        return created(exam);
    }

    // Phân trang exam
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR', 'STUDENT')")
    public ResponseEntity<ApiResponse<Page<ExamResponse>>> getExams(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM, Action.READ);

        return success(
                examService.getExams(keyword, page, size)
        );
    }

    // Tìm exam theo id
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR', 'STUDENT')")
    public ResponseEntity<ApiResponse<ExamResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM, Action.READ);

        var exam = examService.getExamById(id);

        return success(exam);
    }

    // Cập nhật exam theo id
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
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

        return updated(updated);
    }

    // Xóa exam theo id
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
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

        return deleted();
    }

    // Tạo room theo examId
    @PostMapping("/{examId}/rooms")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<ExamRoomResponse>> createRoom(
            @PathVariable Long examId,
            @RequestBody ExamRoomRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.CREATE);

        var room = examService.createRoom(examId, request);

        return created(room);
    }

    // Xóa room
    @DeleteMapping("/rooms/{roomId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable Long roomId,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.DELETE);

        examService.deleteRoom(roomId);

        return deleted();
    }

    // Import exam
    @PostMapping("/{examId}/import")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> importExcel(
            @PathVariable Long examId,
            @RequestParam("file") MultipartFile file,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM, Action.IMPORT);

        importExamService.importFromExcel(file, examId);

        return success(null);
    }
}