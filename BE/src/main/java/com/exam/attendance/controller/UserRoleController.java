package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.RoleMapper;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.UserRoleRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.RoleResponse;
import com.exam.attendance.service.UserRoleService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user-roles")
@RequiredArgsConstructor
public class UserRoleController extends BaseController {

    private final UserRoleService service;
    private final AccessControlService accessControlService;

    // Lấy roles của user
    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getUserRoles(
            @PathVariable Long userId,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER_ROLE,
                Action.READ,
                userId,
                currentUserId
        );

        List<RoleResponse> roles = service.getRolesByUserId(userId)
                .stream()
                .map(RoleMapper::toResponse)
                .toList();

        return success(roles);
    }

    // Thêm role cho user
    @PostMapping("/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> addRolesToUser(
            @PathVariable Long userId,
            @RequestBody UserRoleRequest request,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER_ROLE,
                Action.CREATE,
                userId,
                currentUserId
        );

        service.addRolesToUser(userId, request.getRoleIds());

        return success(null);
    }

    // Replace toàn bộ role
    @PutMapping("/{userId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> replaceUserRoles(
            @PathVariable Long userId,
            @RequestBody UserRoleRequest request,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER_ROLE,
                Action.UPDATE,
                userId,
                currentUserId
        );

        service.replaceUserRoles(userId, request.getRoleIds());

        return updated(null);
    }

    // Xóa role khỏi user
    @DeleteMapping("/{userId}/{roleId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeUserRole(
            @PathVariable Long userId,
            @PathVariable Long roleId,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER_ROLE,
                Action.DELETE,
                userId,
                currentUserId
        );

        service.removeRoleFromUser(userId, roleId);

        return deleted();
    }
}