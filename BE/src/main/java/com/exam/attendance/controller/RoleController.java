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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController extends BaseController {

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

        return success(RoleMapper.toResponse(dto));
    }

    // Danh sách role
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

        return success(result);
    }

    // Tạo role
    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> create(
            @RequestBody RoleRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.CREATE);

        Long id = roleService.create(request);

        return created(id);
    }

    // Update role
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @RequestBody RoleRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.UPDATE);

        roleService.update(id, request);

        return updated(null);
    }

    // Delete role
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.DELETE);

        roleService.delete(id);

        return deleted();
    }
}