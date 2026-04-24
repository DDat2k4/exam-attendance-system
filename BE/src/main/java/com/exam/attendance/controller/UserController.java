package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.UserMapper;
import com.exam.attendance.data.pojo.UserDTO;
import com.exam.attendance.data.request.*;
import com.exam.attendance.data.response.*;
import com.exam.attendance.service.UserService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('USER_READ')")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getUser(@PathVariable Long id) {

        UserDTO dto = userService.getUserById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User fetched", UserMapper.toResponse(dto))
        );
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('USER_READ')")
    public ResponseEntity<ApiResponse<Page<UserDetailResponse>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<UserDetailResponse> result = userService
                .getUsersByRole(role, pageable)
                .map(UserMapper::toResponse);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Users fetched", result)
        );
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('USER_CREATE')")
    public ResponseEntity<ApiResponse<Long>> createUser(
            @RequestBody UserCreateRequest request
    ) {

        Long id = userService.createUser(
                request.getUsername(),
                request.getEmail(),
                request.getPhone(),
                request.getPassword()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "User created", id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('USER_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable Long id,
            @RequestBody UserUpdateRequest request
    ) {

        userService.updateUser(
                id,
                request.getEmail(),
                request.getPassword(),
                request.getActive()
        );

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User updated", null)
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('USER_DELETE')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {

        userService.deleteUser(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "User deleted", null)
        );
    }
}