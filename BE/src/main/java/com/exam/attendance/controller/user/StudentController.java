package com.exam.attendance.controller.user;

import com.exam.attendance.controller.BaseController;
import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import com.exam.attendance.data.request.StudentCreateRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.security.service.AccessControlService;
import com.exam.attendance.service.user.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController extends BaseController {

    private final StudentService studentService;
    private final AccessControlService accessControlService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> createStudent(
            @Valid @RequestBody StudentCreateRequest request,
            Authentication authentication
    ) {

        accessControlService.checkPermission(
                authentication,
                Resource.USER,
                Action.CREATE
        );

        Long id = studentService.createStudent(request);

        return created(id);
    }
}