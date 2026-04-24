package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.RoleMapper;
import com.exam.attendance.data.request.UserRoleRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.RoleResponse;
import com.exam.attendance.service.UserRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-roles")
@RequiredArgsConstructor
public class UserRoleController {

    private final UserRoleService service;

    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_ROLE_READ') and @userRoleSecurity.canViewOrModify(#userId)")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getUserRoles(@PathVariable Long userId) {

        List<RoleResponse> roles = service.getRolesByUserId(userId)
                .stream()
                .map(RoleMapper::toResponse)
                .toList();

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User roles fetched", roles)
        );
    }

    @PostMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_ROLE_CREATE') and @userRoleSecurity.canManageRoles(#userId)")
    public ResponseEntity<ApiResponse<Void>> addRolesToUser(
            @PathVariable Long userId,
            @RequestBody UserRoleRequest request
    ) {

        service.addRolesToUser(userId, request.getRoleIds());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Roles added", null)
        );
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_ROLE_UPDATE') and @userRoleSecurity.canManageRoles(#userId)")
    public ResponseEntity<ApiResponse<Void>> replaceUserRoles(
            @PathVariable Long userId,
            @RequestBody UserRoleRequest request
    ) {

        service.replaceUserRoles(userId, request.getRoleIds());

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Roles replaced", null)
        );
    }

    @DeleteMapping("/{userId}/{roleId}")
    @PreAuthorize("hasAuthority('USER_ROLE_DELETE') and @userRoleSecurity.canManageRoles(#userId)")
    public ResponseEntity<ApiResponse<Void>> removeUserRole(
            @PathVariable Long userId,
            @PathVariable Long roleId
    ) {

        service.removeRoleFromUser(userId, roleId);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Role removed", null)
        );
    }
}