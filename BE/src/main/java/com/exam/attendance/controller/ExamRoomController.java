package com.exam.attendance.controller;

import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.pojo.ExamRoomDTO;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.service.ExamRoomService;
import com.exam.attendance.service.security.AccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exam-rooms")
@RequiredArgsConstructor
public class ExamRoomController {

    private final ExamRoomService examRoomService;
    private final AccessControlService accessControlService;

    // Lấy room theo id
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.READ);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Room detail",
                        examRoomService.getById(id)
                )
        );
    }

    // Tạo room
    @PostMapping
    public ResponseEntity<ApiResponse<ExamRoomDTO>> create(
            @RequestBody ExamRoom request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.CREATE);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Room created",
                        examRoomService.create(request)
                )
        );
    }

    // Cập nhật room
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> update(
            @PathVariable Long id,
            @RequestBody ExamRoom request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.UPDATE);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Room updated",
                        examRoomService.update(id, request)
                )
        );
    }

    // Xóa room
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.DELETE);

        examRoomService.delete(id);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Room deleted",
                        null
                )
        );
    }

    // Phân trang, lọc
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ExamRoomDTO>>> getRooms(
            @RequestParam Long examId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.EXAM_ROOM, Action.READ);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Rooms fetched",
                        examRoomService.getRoomsByExam(examId, page, size)
                )
        );
    }
}