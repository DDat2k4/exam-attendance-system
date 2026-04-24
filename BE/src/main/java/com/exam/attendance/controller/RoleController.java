package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.RoleMapper;
import com.exam.attendance.data.pojo.RoleDTO;
import com.exam.attendance.data.request.RoleRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.RoleResponse;
import com.exam.attendance.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public ResponseEntity<ApiResponse<RoleResponse>> getById(@PathVariable Long id) {

        RoleDTO dto = roleService.getById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Role fetched", RoleMapper.toResponse(dto))
        );
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public ResponseEntity<ApiResponse<Page<RoleResponse>>> getAll(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size);

        Page<RoleResponse> result = roleService
                .getAll(name, pageable)
                .map(RoleMapper::toResponse);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Roles fetched", result)
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_CREATE')")
    public ResponseEntity<ApiResponse<Long>> create(
            @RequestBody RoleRequest request
    ) {

        Long id = roleService.create(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Role created", id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @RequestBody RoleRequest request
    ) {

        roleService.update(id, request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Role updated", null)
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {

        roleService.delete(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Role deleted", null)
        );
    }
}