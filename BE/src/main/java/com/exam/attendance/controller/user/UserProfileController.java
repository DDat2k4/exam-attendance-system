package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.UserProfileMapper;
import com.exam.attendance.data.pojo.UserProfileDTO;
import com.exam.attendance.data.pojo.enums.Action;
import com.exam.attendance.data.pojo.enums.Resource;
import com.exam.attendance.data.request.UserProfileRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.UserProfileResponse;
import com.exam.attendance.service.user.UserProfileService;
import com.exam.attendance.service.security.AccessControlService;
import com.exam.attendance.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user-profiles")
@RequiredArgsConstructor
public class UserProfileController extends BaseController {

    private final UserProfileService service;
    private final AccessControlService accessControlService;

    // Lấy profile theo id
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT', 'PROCTOR')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getById(
            @PathVariable Long id,
            Authentication auth
    ) {

        UserProfileDTO dto = service.getById(id);

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER_PROFILE,
                Action.READ,
                dto.getUserId(),
                currentUserId
        );
        return success(UserProfileMapper.toResponse(dto));
    }

    // Lấy profile của chính mình
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT', 'PROCTOR')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> me(
            Authentication auth
    ) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        UserProfileDTO dto = service.getByUserId(currentUserId);

        accessControlService.checkPermission(
                auth,
                Resource.USER_PROFILE,
                Action.READ,
                dto.getUserId(),
                currentUserId
        );

        return success(UserProfileMapper.toResponse(dto));
    }

    // Lấy danh sách profile (phân trang)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROCTOR')")
    public ResponseEntity<ApiResponse<Page<UserProfileResponse>>> getAll(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {

        auth.getAuthorities()
                .forEach(a -> System.out.println(a.getAuthority()));

        accessControlService.checkPermission(auth, Resource.USER_PROFILE, Action.READ);

        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("name").ascending());

        Page<UserProfileResponse> result = service
                .getAll(name, pageable)
                .map(UserProfileMapper::toResponse);

        return success(result);
    }

    // Tạo profile
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT', 'PROCTOR')")
    public ResponseEntity<ApiResponse<Long>> create(
            @Valid @RequestBody UserProfileRequest request,
            Authentication auth
    ) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        accessControlService.checkPermission(
                auth,
                Resource.USER_PROFILE,
                Action.CREATE,
                request.getUserId(),
                currentUserId
        );

        Long id = service.create(request);

        return created(id);
    }

    // Cập nhật profile
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT', 'PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @RequestBody UserProfileRequest request,
            Authentication auth
    ) {

        UserProfileDTO dto = service.getById(id);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        accessControlService.checkPermission(
                auth,
                Resource.USER_PROFILE,
                Action.UPDATE,
                dto.getUserId(),
                currentUserId
        );

        service.update(id, request);

        return updated(null);
    }

    // Xóa profile
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication auth
    ) {

        accessControlService.checkPermission(auth, Resource.USER_PROFILE, Action.DELETE);

        service.delete(id);

        return deleted();
    }
}