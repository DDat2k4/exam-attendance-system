package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.RoleMapper;
import com.exam.attendance.data.pojo.RoleDTO;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.RoleRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.RoleResponse;
import com.exam.attendance.service.RoleService;
import com.exam.attendance.service.security.AccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;
    private final AccessControlService accessControlService;

    // Lấy chi tiết role theo ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.READ);

        RoleDTO dto = roleService.getById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Role fetched", RoleMapper.toResponse(dto))
        );
    }

    // Lấy danh sách role (có phân trang + filter theo tên)
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Page<RoleResponse>>> getAll(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.READ);

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<RoleResponse> result = roleService
                .getAll(name, pageable)
                .map(RoleMapper::toResponse);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Roles fetched", result)
        );
    }

    // Tạo mới role
    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> create(
            @RequestBody RoleRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.CREATE);

        Long id = roleService.create(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Role created", id));
    }

     // Cập nhật role
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @RequestBody RoleRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.UPDATE);

        roleService.update(id, request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Role updated", null)
        );
    }

    // Xoá role
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.DELETE);

        roleService.delete(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Role deleted", null)
        );
    }
}