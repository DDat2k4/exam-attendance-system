package com.exam.attendance.controller;

import com.exam.attendance.data.entity.ExamRoom;
import com.exam.attendance.data.pojo.ExamRoomDTO;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.service.ExamRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam-rooms")
@RequiredArgsConstructor
public class ExamRoomController {

    private final ExamRoomService examRoomService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXAM_ROOM_READ')")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Room detail",
                        examRoomService.getById(id)
                )
        );
    }

    // CREATE
    @PostMapping
    @PreAuthorize("hasAnyAuthority('EXAM_ROOM_CREATE')")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> create(
            @RequestBody ExamRoom request
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Room created",
                        examRoomService.create(request)
                )
        );
    }

    // UPDATE
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXAM_ROOM_UPDATE')")
    public ResponseEntity<ApiResponse<ExamRoomDTO>> update(
            @PathVariable Long id,
            @RequestBody ExamRoom request
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Room updated",
                        examRoomService.update(id, request)
                )
        );
    }

    // DELETE
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('EXAM_ROOM_DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
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
    @PreAuthorize("hasAnyAuthority('EXAM_ROOM_PAGE')")
    public ResponseEntity<ApiResponse<Page<ExamRoomDTO>>> getRooms(
            @RequestParam Long examId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Rooms fetched",
                        examRoomService.getRoomsByExam(examId, page, size)
                )
        );
    }
}
