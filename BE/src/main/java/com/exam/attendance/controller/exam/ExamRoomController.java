package com.exam.attendance.controller;

import com.exam.attendance.data.pojo.ExamRoomDTO;
import com.exam.attendance.data.pojo.RoomStudentDTO;
import com.exam.attendance.data.request.AssignRoomBatchRequest;
import com.exam.attendance.data.request.ExamRoomRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.service.exam.ExamRoomService;
import com.exam.attendance.service.security.AccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam-rooms")
@RequiredArgsConstructor
public class ExamRoomController extends BaseController {

    private final ExamRoomService examRoomService;
    private final AccessControlService accessControlService;

    // Lấy room theo id
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCTOR', 'STUDENT')")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.READ);

        return success(examRoomService.getById(id));
    }

    // Tạo room
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> create(
            @RequestBody ExamRoomRequest request,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.CREATE);

        return created(examRoomService.create(request));
    }

    // Cập nhật room
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> update(
            @PathVariable Long id,
            @RequestBody ExamRoomRequest request,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.UPDATE);

        return updated(examRoomService.update(id, request));
    }

    // Xóa room
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.DELETE);

        examRoomService.delete(id);

        return deleted();
    }

    // Phân trang, lọc
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCTOR', 'STUDENT')")
    public ResponseEntity<ApiResponse<Page<ExamRoomDTO>>> getRooms(
            @RequestParam Long examId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.READ);

        return success(examRoomService.getRoomsByExam(examId, page, size));
    }

    // Lấy toàn bộ theo examId
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCTOR', 'STUDENT')")
    public ResponseEntity<ApiResponse<List<ExamRoomDTO>>> getRoomsByExamId(
            @RequestParam Long examId,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.READ);

        return success(examRoomService.getRoomsByExam(examId));
    }

    // Gán student vào room
    @PostMapping("/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assignRoom(
            @RequestParam Long registrationId,
            @RequestParam Long roomId,
            @RequestParam Integer seat,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.UPDATE);

        examRoomService.assignRoom(registrationId, roomId, seat);

        return updated(null);
    }

    // Gán nhiều student vào room
    @PostMapping("/assign-batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assignRoomBatch(
            @RequestBody AssignRoomBatchRequest request,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.UPDATE);

        examRoomService.assignMultipleStudents(request);

        return updated(null);
    }

    @DeleteMapping("/unassign-student")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeStudentFromRoom(
            @RequestParam Long registrationId,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.EXAM_ROOM,
                Action.UPDATE
        );

        examRoomService.removeStudentFromRoom(registrationId);

        return updated(null);
    }

    @DeleteMapping("/unassign-batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeStudentsFromRoom(
            @RequestBody List<Long> registrationIds,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.EXAM_ROOM,
                Action.UPDATE
        );

        examRoomService.removeStudentsFromRoom(registrationIds);

        return updated(null);
    }

    // Xem danh sách sinh viên trong room
    @GetMapping("/{roomId}/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCTOR')")
    public ResponseEntity<ApiResponse<Page<RoomStudentDTO>>> getStudentsInRoom(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth
    ) {
        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.READ);

        return success(
                examRoomService.getStudentsInRoom(roomId, page, size)
        );
    }
}