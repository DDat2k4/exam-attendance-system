package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.PermissionMapper;
import com.exam.attendance.data.pojo.PermissionDTO;
import com.exam.attendance.data.request.PermissionRequest;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.PermissionService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService service;

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PERMISSION_READ')")
    public ResponseEntity<ApiResponse<PermissionResponse>> getById(@PathVariable Long id) {

        PermissionDTO dto = service.getById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permission fetched",
                        PermissionMapper.toResponse(dto))
        );
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERMISSION_READ')")
    public ResponseEntity<ApiResponse<Page<PermissionResponse>>> getAll(
            @RequestParam(required = false) String code,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<PermissionResponse> result = service
                .getAll(code, pageable)
                .map(PermissionMapper::toResponse);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permissions fetched", result)
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERMISSION_CREATE')")
    public ResponseEntity<ApiResponse<Long>> create(
            @RequestBody PermissionRequest request
    ) {

        Long id = service.create(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Permission created", id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERMISSION_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @RequestBody PermissionRequest request
    ) {

        service.update(id, request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permission updated", null)
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERMISSION_DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {

        service.delete(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permission deleted", null)
        );
    }

    @GetMapping("/grouped")
    @PreAuthorize("hasAuthority('PERMISSION_READ')")
    public ResponseEntity<ApiResponse<List<PermissionGroupResponse>>> getGrouped() {

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        "Grouped permissions fetched",
                        service.getGroupedPermissions()
                )
        );
    }
}