package com.exam.attendance.controller;

import com.exam.attendance.data.mapper.UserProfileMapper;
import com.exam.attendance.data.pojo.UserProfileDTO;
import com.exam.attendance.data.request.UserProfileRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.UserProfileResponse;
import com.exam.attendance.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user-profiles")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService service;

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_PROFILE_READ')")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getById(@PathVariable Long id) {

        UserProfileDTO dto = service.getById(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profile fetched", UserProfileMapper.toResponse(dto))
        );
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER_PROFILE_READ_PAGE')")
    public ResponseEntity<ApiResponse<Page<UserProfileResponse>>> getAll(
            @RequestParam(required = false) String name,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        Pageable pageable = PageRequest.of(page - 1, size);

        Page<UserProfileResponse> result = service
                .getAll(name, pageable)
                .map(UserProfileMapper::toResponse);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profiles fetched", result)
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER_PROFILE_CREATE')")
    public ResponseEntity<ApiResponse<Long>> create(
            @RequestBody UserProfileRequest request
    ) {

        Long id = service.create(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Profile created", id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_PROFILE_UPDATE')")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @RequestBody UserProfileRequest request
    ) {

        service.update(id, request);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profile updated", null)
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_PROFILE_DELETE')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {

        service.delete(id);

        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profile deleted", null)
        );
    }
}