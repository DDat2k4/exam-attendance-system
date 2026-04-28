package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.PermissionMapper;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.RolePermissionRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.PermissionResponse;
import com.exam.attendance.service.RolePermissionService;
import com.exam.attendance.service.security.AccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolePermissionController extends BaseController {

    private final RolePermissionService service;
    private final AccessControlService accessControl;

    // Lấy permissions của role
    @GetMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissions(
            @PathVariable Long roleId,
            Authentication auth
    ) {

        accessControl.checkPermission(auth, Resource.ROLE, Action.READ);

        List<PermissionResponse> result = service.getPermissions(roleId)
                .stream()
                .map(PermissionMapper::toResponse)
                .toList();

        return success(result);
    }

    // Thêm permissions vào role
    @PostMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addPermissions(
            @PathVariable Long roleId,
            @RequestBody RolePermissionRequest request,
            Authentication auth
    ) {

        accessControl.checkPermission(auth, Resource.ROLE, Action.UPDATE);

        service.addPermissions(roleId, request.getPermissionIds());

        return updated(null);
    }

    // Replace toàn bộ permissions
    @PutMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> replacePermissions(
            @PathVariable Long roleId,
            @RequestBody RolePermissionRequest request,
            Authentication auth
    ) {

        accessControl.checkPermission(auth, Resource.ROLE, Action.UPDATE);

        service.replacePermissions(roleId, request.getPermissionIds());

        return updated(null);
    }

    // Xoá permission khỏi role
    @DeleteMapping("/{roleId}/permissions/{permissionId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removePermission(
            @PathVariable Long roleId,
            @PathVariable Long permissionId,
            Authentication auth
    ) {

        accessControl.checkPermission(auth, Resource.ROLE, Action.UPDATE);

        service.removePermission(roleId, permissionId);

        return deleted();
    }
}