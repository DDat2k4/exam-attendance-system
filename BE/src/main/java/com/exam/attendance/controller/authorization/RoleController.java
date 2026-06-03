package com.exam.attendance.controller.authorization;

import com.exam.attendance.controller.BaseController;
import com.exam.attendance.data.mapper.RoleMapper;
import com.exam.attendance.data.dto.RoleDTO;
import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import com.exam.attendance.data.request.RoleRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.RoleResponse;
import com.exam.attendance.service.authorization.RoleService;
import com.exam.attendance.security.service.AccessControlService;
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
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.ROLE, Action.DELETE);

        roleService.delete(id);

        return deleted();
    }
}