package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.UserMapper;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.*;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.UserService;

import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController extends BaseController {

    private final UserService userService;
    private final AccessControlService accessControlService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'STUDENT')")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getUser(
            @PathVariable Long id,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER,
                Action.READ,
                id,
                currentUserId);

        UserDTO dto = userService.getUserById(id);

        return success(UserMapper.toResponse(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'PROCTOR')")
    public ResponseEntity<ApiResponse<Page<UserDetailResponse>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.USER, Action.READ);

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<UserDetailResponse> result = userService
                .getUsersByRole(role, pageable)
                .map(UserMapper::toResponse);

        return success(result);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'STUDENT', 'PROCTOR')")
    public ResponseEntity<ApiResponse<Long>> createUser(
            @RequestBody UserCreateRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.USER, Action.CREATE);

        Long id = userService.createUser(
                request.getUsername(),
                request.getEmail(),
                request.getPhone(),
                request.getPassword()
        );

        return created(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'STUDENT', 'PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable Long id,
            @RequestBody UserUpdateRequest request,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER,
                Action.UPDATE,
                id,
                currentUserId
        );

        userService.updateUser(
                id,
                request.getEmail(),
                request.getPassword(),
                request.getActive()
        );

        return updated(null);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER,
                Action.DELETE,
                id,
                currentUserId
        );

        userService.deleteUser(id);

        return deleted();
    }
}