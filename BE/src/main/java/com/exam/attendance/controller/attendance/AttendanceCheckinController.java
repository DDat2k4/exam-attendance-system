package com.exam.attendance.controller.attendance;

import com.exam.attendance.controller.BaseController;
import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.enums.AttendanceStatus;
import com.exam.attendance.data.mapper.AttendanceSessionMapper;
import com.exam.attendance.data.enums.Action;
import com.exam.attendance.data.enums.Resource;
import com.exam.attendance.data.request.CheckinRequest;
import com.exam.attendance.data.request.EncryptedRequest;
import com.exam.attendance.data.request.ManualCheckinRequest;
import com.exam.attendance.data.response.ApiResponse;
import com.exam.attendance.data.response.AttendanceSessionResponse;
import com.exam.attendance.service.attendance.AttendanceCheckinService;
import com.exam.attendance.service.identity.ProctorService;
import com.exam.attendance.service.user.UserService;
import com.exam.attendance.security.service.AccessControlService;
import com.exam.attendance.security.service.CryptoService;
import com.exam.attendance.security.SecurityContextUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceCheckinController extends BaseController {

    private final AttendanceCheckinService attendanceCheckinService;
    private final ProctorService proctorService;
    private final AccessControlService accessControlService;
    private final CryptoService cryptoService;
    private final ObjectMapper objectMapper;
    private final UserService userService;

    // =========================================================
    // NFC CHECKIN
    // =========================================================
    @PostMapping("/nfc-checkin")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> nfcCheckin(
            @RequestBody EncryptedRequest request
    ) {

        boolean valid =
                cryptoService.verifySignature(
                        request.getData(),
                        request.getSignature()
                );

        if (!valid) {
            throw new RuntimeException("Invalid signature");
        }

        String json = cryptoService.decrypt(
                request.getData(),
                request.getIv()
        );

        try {

            CheckinRequest checkinRequest =
                    objectMapper.readValue(json, CheckinRequest.class);

            AttendanceSession attendance =
                    attendanceCheckinService.checkin(checkinRequest);

            String message =
                    attendance.getStatus() == AttendanceStatus.PENDING
                            ? "Khuôn mặt không khớp, chờ giám thị xác minh"
                            : "Điểm danh thành công";

            return created(
                    message,
                    AttendanceSessionMapper.toResponse(attendance)
            );

        } catch (JsonProcessingException e) {
            throw new RuntimeException("JSON request không hợp lệ");
        }
    }

    // =========================================================
    // MANUAL CHECKIN
    // =========================================================
    @PostMapping("/manual-checkin")
    @PreAuthorize("hasAnyRole('ADMIN','PROCTOR')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> manualCheckin(
            @RequestBody ManualCheckinRequest request,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.ATTENDANCE,
                Action.CREATE
        );

        User proctorUser =
                userService.getByUsername(
                        auth.getName()
                );

        AttendanceSession attendance =
                attendanceCheckinService.manualCheckin(
                        request.getExamSessionId(),
                        request.getBase64Image(),
                        proctorUser,
                        request.getReason()
                );

        return created(
                AttendanceSessionMapper.toResponse(
                        attendance
                )
        );
    }

    // =========================================================
    // MANUAL APPROVE
    // =========================================================
    @PostMapping("/manual-approve/{attendanceId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> manualApprove(
            @PathVariable Long attendanceId,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.ATTENDANCE,
                Action.UPDATE
        );

        String base64Image =
                body.get("base64Image");

        User proctorUser =
                userService.getByUsername(
                        auth.getName()
                );

        proctorService.manualApproveCheckin(
                attendanceId,
                base64Image,
                proctorUser
        );

        return success(null);
    }

    // =========================================================
    // MANUAL REJECT
    // =========================================================
    @PostMapping("/manual-reject/{attendanceId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROCTOR')")
    public ResponseEntity<ApiResponse<Void>> manualReject(
            @PathVariable Long attendanceId,
            @RequestParam String reason,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.ATTENDANCE,
                Action.UPDATE
        );

        proctorService.manualRejectCheckin(
                attendanceId,
                reason,
                SecurityContextUtils.getCurrentUser()
        );

        return success(null);
    }

    // =========================================================
    // GET ATTENDANCE BY ID
    // =========================================================
    @GetMapping("/{attendanceId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROCTOR')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> getAttendanceById(
            @PathVariable Long attendanceId,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.ATTENDANCE,
                Action.READ
        );

        return success(
                proctorService.getAttendanceById(
                        attendanceId
                )
        );
    }

    // =========================================================
    // GET ATTENDANCE BY SESSION
    // =========================================================
    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROCTOR')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> getAttendance(
            @PathVariable Long sessionId,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.ATTENDANCE,
                Action.READ
        );

        AttendanceSessionResponse attendance =
                proctorService.getAttendance(
                        sessionId
                );

        return success(attendance);
    }

    // =========================================================
    // GET PENDING ATTENDANCES
    // =========================================================
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','PROCTOR')")
    public ResponseEntity<ApiResponse<List<AttendanceSessionResponse>>> getPendingAttendances(
            @RequestParam Long roomId,
            Authentication auth
    ) {

        accessControlService.checkPermission(
                auth,
                Resource.ATTENDANCE,
                Action.READ
        );

        return success(
                proctorService.getPendingAttendances(roomId)
        );
    }
}