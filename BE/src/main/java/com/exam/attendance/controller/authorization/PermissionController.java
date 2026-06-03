package com.exam.attendance.controller.authorization;

import com.exam.attendance.controller.BaseController;
import com.exam.attendance.data.mapper.PermissionMapper;
import com.exam.attendance.data.dto.PermissionDTO;
import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import com.exam.attendance.data.request.PermissionRequest;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.authorization.PermissionService;

import com.exam.attendance.security.service.AccessControlService;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController extends BaseController {

    private final PermissionService service;
    private final AccessControlService accessControl;

    // Lấy permission theo id
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PermissionResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {
        accessControl.checkPermission(auth, Resource.PERMISSION, Action.READ);

        PermissionDTO dto = service.getById(id);

        return success(PermissionMapper.toResponse(dto));
    }

    // Phân trang permission
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<PermissionResponse>>> getAll(
            @RequestParam(required = false) String resource,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {
        accessControl.checkPermission(auth, Resource.PERMISSION, Action.READ);

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<PermissionResponse> result = service
                .getAll(resource, pageable)
                .map(PermissionMapper::toResponse);

        return success(result);
    }

    // Tạo permission
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> create(
            @RequestBody PermissionRequest request,
            Authentication auth
    ) {
        accessControl.checkPermission(auth, Resource.PERMISSION, Action.CREATE);

        Long id = service.create(request);

        return created(id);
    }

    // Update permission
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @RequestBody PermissionRequest request,
            Authentication auth
    ) {
        accessControl.checkPermission(auth, Resource.PERMISSION, Action.UPDATE);

        service.update(id, request);

        return updated(null);
    }

    // Delete permission
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {
        accessControl.checkPermission(auth, Resource.PERMISSION, Action.DELETE);

        service.delete(id);

        return deleted();
    }

    // Grouped permissions
    @GetMapping("/grouped")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PermissionGroupResponse>>> getGrouped(
            Authentication auth
    ) {
        accessControl.checkPermission(auth, Resource.PERMISSION, Action.READ);

        return success(service.getGroupedPermissions());
    }
}