package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.PermissionMapper;
import com.exam.attendance.data.request.RolePermissionRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.PermissionResponse;
import com.exam.attendance.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolePermissionController {

    private final RolePermissionService service;

    @GetMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('ROLE_PERMISSION_READ')")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissions(
            @PathVariable Long roleId
    ) {

        List<PermissionResponse> result = service.getPermissions(roleId)
                .stream()
                .map(PermissionMapper::toResponse)
                .toList();

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permissions fetched", result)
        );
    }

    @PostMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('ROLE_PERMISSION_CREATE')")
    public ResponseEntity<ApiResponse<Void>> addPermissions(
            @PathVariable Long roleId,
            @RequestBody RolePermissionRequest request
    ) {

        service.addPermissions(roleId, request.getPermissionIds());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permissions added", null)
        );
    }

    @PutMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('ROLE_PERMISSION_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> replacePermissions(
            @PathVariable Long roleId,
            @RequestBody RolePermissionRequest request
    ) {

        service.replacePermissions(roleId, request.getPermissionIds());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permissions replaced", null)
        );
    }

    @DeleteMapping("/{roleId}/permissions/{permissionId}")
    @PreAuthorize("hasAuthority('ROLE_PERMISSION_DELETE')")
    public ResponseEntity<ApiResponse<Void>> removePermission(
            @PathVariable Long roleId,
            @PathVariable Long permissionId
    ) {

        service.removePermission(roleId, permissionId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Permission removed", null)
        );
    }
}