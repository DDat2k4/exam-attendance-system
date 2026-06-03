package com.exam.attendance.service;

import com.exam.attendance.data.entity.*;
import com.exam.attendance.data.mapper.AttendanceSessionMapper;
import com.exam.attendance.data.mapper.ProctorMapper;
import com.exam.attendance.data.pojo.AlertMessage;
import com.exam.attendance.data.pojo.ProctorDashboardDTO;
import com.exam.attendance.data.pojo.enums.AlertType;
import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import com.exam.attendance.data.pojo.enums.RiskLevel;
import com.exam.attendance.data.request.ProctorDashboardFilterRequest;
import com.exam.attendance.data.response.AttendanceSessionResponse;
import com.exam.attendance.data.response.UploadResponse;
import com.exam.attendance.repository.AttendanceSessionRepository;
import com.exam.attendance.repository.CitizenCardRepository;
import com.exam.attendance.service.ai.AiClientService;
import com.exam.attendance.service.attendance.AttendanceLogService;
import com.exam.attendance.service.attendance.AttendanceSessionService;
import com.exam.attendance.service.exam.ExamSessionService;
import com.exam.attendance.service.identity.VerificationService;
import com.exam.attendance.service.socket.AlertService;
import com.exam.attendance.service.uploads.FileUploadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProctorService {

    private final ProctorMapper proctorMapper;
    private final ExamSessionService examSessionService;
    private final AttendanceSessionService attendanceService;
    private final VerificationService verificationService;
    private final AttendanceLogService logService;
    private final AlertService alertService;
    private final AttendanceSessionRepository attendanceRepo;
    private final CitizenCardRepository citizenCardRepo;
    private final FileUploadService fileUploadService;
    private final SessionStateService sessionStateService;
    private final AiClientService aiClientService;
    private final ObjectMapper objectMapper;

    // =========================================================
    // DASHBOARD
    // =========================================================
    public Page<ProctorDashboardDTO> getDashboard(
            ProctorDashboardFilterRequest req
    ) {

        return examSessionService.getDashboard(req);
    }

    public List<ProctorDashboardDTO> getDashboardFast(
            Long roomId
    ) {

        List<Object[]> rows =
                examSessionService.getDashboardRaw(roomId);

        return rows.stream()
                .map(row -> {

                    ExamSession session =
                            (ExamSession) row[0];

                    AttendanceSession attendance =
                            (AttendanceSession) row[1];

                    IdentityVerification latest =
                            (IdentityVerification) row[2];

                    return proctorMapper.toDTO(
                            session,
                            attendance,
                            latest
                    );

                })
                .toList();
    }

    // =========================================================
    // VERIFY HISTORY
    // =========================================================
    public List<IdentityVerification> getVerificationHistory(
            Long sessionId
    ) {

        return verificationService.getHistory(sessionId);
    }

    // =========================================================
    // APPROVE
    // =========================================================
    @Transactional
    public void approve(
            Long sessionId,
            User proctorUser
    ) {

        ExamSession session = examSessionService.getById(sessionId);
        validateCanApprove(session);
        AttendanceSession attendance = attendanceService.getOrCreate(session);
        attendance.setStatus(AttendanceStatus.VERIFIED);
        attendance.setVerifiedAt(LocalDateTime.now());
        attendance.setVerifiedBy(proctorUser);
        attendanceService.save(attendance);
        ExamSessionStatus currentStatus = session.getStatus();

        if (currentStatus == ExamSessionStatus.PENDING_VERIFY_REVIEW) {

            // INITIAL VERIFY FAIL
            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.IN_PROGRESS,
                    "Được giám thị xác minh thủ công"
            );

            if (session.getSessionStart() == null) {
                session.setSessionStart(LocalDateTime.now());
            }

        } else if (currentStatus == ExamSessionStatus.PENDING_REVIEW) {

            // RANDOM VERIFY FAIL
            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.IN_PROGRESS,
                    "Tiếp tục làm bài"
            );

        } else if (currentStatus == ExamSessionStatus.PENDING_DEVICE_APPROVAL) {
            throw new RuntimeException("Vui lòng dùng approveDeviceChange()");

        } else {

            throw new RuntimeException("Session không ở trạng thái cần duyệt");
        }

        session.setIsFlagged(false);
        session.setLastSeenAt(LocalDateTime.now());
        session.setReviewResolvedAt(LocalDateTime.now());
        verificationService.resetVerificationCounter(session, "RANDOM");
        examSessionService.save(session);

        sendAlert(
                session,
                AlertType.APPROVED,
                "Đã được giám thị duyệt",
                RiskLevel.LOW
        );

        logService.log(
                "MANUAL_APPROVE",
                "Approved by proctorId="
                        + proctorUser.getId(),
                "ADMIN",
                "SUCCESS",
                session
        );
    }

    // =========================================================
    // REJECT
    // =========================================================
    @Transactional
    public void reject(
            Long sessionId,
            String reason,
            User proctorUser
    ) {

        ExamSession session = examSessionService.getById(sessionId);
        AttendanceSession attendance = attendanceService.getOrCreate(session);
        attendance.setStatus(AttendanceStatus.FAILED);
        attendance.setVerifiedAt(LocalDateTime.now());
        attendance.setVerifiedBy(proctorUser);
        attendanceService.save(attendance);
        sessionStateService.updateStatus(
                session,
                ExamSessionStatus.BLOCKED,
                "Phiên thi đã bị khóa bởi giám thị"
        );
        session.setIsFlagged(true);
        examSessionService.save(session);
        sendAlert(
                session,
                AlertType.REJECTED,
                "Bị từ chối: " + reason,
                RiskLevel.HIGH
        );

        sendAlert(
                session,
                AlertType.SESSION_BLOCKED,
                "Phiên thi đã bị khóa",
                RiskLevel.HIGH
        );

        logService.log(
                "MANUAL_REJECT",
                reason,
                "ADMIN",
                "FAILED",
                session
        );
    }

    // =========================================================
    // FLAG
    // =========================================================
    @Transactional
    public void flag(
            Long sessionId,
            String reason
    ) {

        ExamSession session =
                examSessionService.getById(sessionId);

        if (Boolean.TRUE.equals(session.getIsFlagged())) {
            return;
        }

        session.setIsFlagged(true);
        // không block ngay
        sessionStateService.updateStatus(
                session,
                ExamSessionStatus.PENDING_REVIEW,
                "Đang chờ giám thị xác minh"
        );

        examSessionService.save(session);
        sendAlert(
                session,
                AlertType.FLAGGED,
                "Bị đánh dấu nghi vấn",
                RiskLevel.HIGH
        );

        logService.log(
                "FLAGGED",
                reason,
                "CHEAT",
                "FAILED",
                session
        );
    }

    // =========================================================
    // UNFLAG
    // =========================================================
    @Transactional
    public void unflag(
            Long sessionId
    ) {

        ExamSession session = examSessionService.getById(sessionId);
        session.setIsFlagged(false);
        restoreSessionStatus(session);
        session.setReviewResolvedAt(LocalDateTime.now());

        verificationService.resetVerificationCounter(
                session,
                "RANDOM"
        );

        examSessionService.save(session);

        sendAlert(
                session,
                AlertType.UNFLAGGED,
                "Đã được bỏ cờ",
                RiskLevel.LOW
        );

        logService.log(
                "UNFLAG",
                "Proctor removed flag",
                "ADMIN",
                "SUCCESS",
                session
        );
    }

    // =========================================================
    // APPROVE DEVICE CHANGE
    // =========================================================
    @Transactional
    public void approveDeviceChange(
            Long sessionId,
            User proctorUser
    ) {

        ExamSession session = examSessionService.getById(sessionId);
        if (session.getPendingDeviceId() == null) {
            throw new RuntimeException("No pending device");
        }

        if (session.getStatus() != ExamSessionStatus.PENDING_DEVICE_APPROVAL) {
            throw new RuntimeException("Session not pending device approval");
        }

        session.setDeviceId(session.getPendingDeviceId());
        session.setPendingDeviceId(null);
        // reset reconnect token
        session.setReconnectToken(UUID.randomUUID().toString());
        // restore status
        if (session.getSessionStart() == null) {
            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.CHECKED_IN,
                    "Điểm danh thành công, vui lòng xác minh khuôn mặt"
            );
        } else {

            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.IN_PROGRESS,
                    "Đã được phép vào thi"
            );
        }

        session.setIsFlagged(false);
        session.setLastSeenAt(LocalDateTime.now());
        session.setReviewResolvedAt(LocalDateTime.now());

        verificationService.resetVerificationCounter(
                session,
                "RANDOM"
        );

        examSessionService.save(session);
        sendAlert(
                session,
                AlertType.APPROVED,
                "Đổi thiết bị đã được duyệt",
                RiskLevel.LOW
        );

        logService.log(
                "DEVICE_APPROVED",
                "Approved by proctorId="
                        + proctorUser.getId(),
                "ADMIN",
                "SUCCESS",
                session
        );
    }

    // =========================================================
    // FLAGGED LIST
    // =========================================================
    public List<ExamSession> getFlaggedSessions() {

        return examSessionService.getFlaggedSessions();
    }

    // =========================================================
    // VALIDATION
    // =========================================================
    private void validateCanApprove(
            ExamSession session
    ) {

        if (session.getStatus() == ExamSessionStatus.DONE) {
            throw new RuntimeException("Session already finished");
        }

        if (session.getStatus() == ExamSessionStatus.BLOCKED) {
            throw new RuntimeException("Session already blocked");
        }

        if (session.getStatus()
                != ExamSessionStatus.PENDING_REVIEW
                && session.getStatus()
                != ExamSessionStatus.PENDING_VERIFY_REVIEW) {

            throw new RuntimeException("Session không cần duyệt");
        }
    }

    private void sendAlert(
            ExamSession session,
            AlertType type,
            String message,
            RiskLevel level
    ) {

        alertService.sendAlert(
                AlertMessage.builder()
                        .sessionId(session.getId())
                        .userId(session.getUser().getId())
                        .roomId(session.getRoom().getId())
                        .type(type)
                        .message(message)
                        .severity(level)
                        .timestamp(System.currentTimeMillis())
                        .build()
        );
    }

    // =========================================================
    // MANUAL APPROVE CHECKIN
    // =========================================================
    @Transactional
    public void manualApproveCheckin(
            Long attendanceId,
            String base64Image,
            User proctorUser
    ) {

        AttendanceSession attendance =
                attendanceRepo
                        .findById(attendanceId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Attendance not found"
                                )
                        );

        ExamSession session = attendance.getExamSession();
        CitizenCard card = session.getUser().getCitizenCard();

        if (card == null) {
            throw new RuntimeException("Không tìm thấy CCCD");
        }

        try {

            // =====================================================
            // upload ảnh manual mới
            // =====================================================
            String imageUrl = attendance.getAttendancePhoto();
            if (base64Image != null && !base64Image.isBlank()) {

                UploadResponse upload =
                        fileUploadService
                                .uploadBase64Async(
                                        base64Image,
                                        session.getUser().getId()
                                )
                                .join();

                imageUrl = upload.getUrl();
                attendance.setAttendancePhoto(imageUrl);
            }

            // download ảnh
            byte[] imageBytes = fileUploadService.downloadFile(imageUrl);

            // extract embedding
            Map<String, Object> aiResult =
                    aiClientService.extractEmbedding(
                            imageBytes
                    );

            if (aiResult == null) {
                throw new RuntimeException("AI không phản hồi");
            }

            String status = String.valueOf(aiResult.get("status"));
            if (!"SUCCESS".equalsIgnoreCase(status)) {
                throw new RuntimeException("Không extract được embedding");
            }

            Object embedding = aiResult.get("embedding");

            if (embedding == null) {
                throw new RuntimeException("Embedding null");
            }

            // update embedding
            String embeddingJson =
                    objectMapper.writeValueAsString(embedding);

            card.setFaceEmbedding(embeddingJson);
            citizenCardRepo.save(card);

            // attendance
            attendance.setStatus(AttendanceStatus.VERIFIED);
            attendance.setVerifiedAt(LocalDateTime.now());
            attendance.setVerifiedBy(proctorUser);
            attendance.setReviewNote("Manual approved by proctor");

            attendanceRepo.save(attendance);

            // session
            if (session.getStatus() == ExamSessionStatus.BLOCKED) {
                throw new RuntimeException("Session bị khóa");
            }

            if (session.getStatus() == ExamSessionStatus.IN_PROGRESS) {
                throw new RuntimeException("Đang thi không thể duyệt lại checkin");
            }

            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.CHECKED_IN,
                    "Điểm danh thành công, vui lòng xác minh khuôn mặt"
            );

            session.setIsFlagged(false);
            session.setLastSeenAt(LocalDateTime.now());
            session.setReviewResolvedAt(LocalDateTime.now());
            verificationService.resetVerificationCounter(session, "INITIAL");

            examSessionService.save(session);

            // alert
            sendAlert(
                    session,
                    AlertType.APPROVED,
                    "Điểm danh đã được giám thị duyệt",
                    RiskLevel.LOW
            );

            // log
            logService.log(
                    "MANUAL_CHECKIN_APPROVE",
                    "Approved by proctorId="
                            + proctorUser.getId(),
                    "CHECKIN",
                    "SUCCESS",
                    session
            );

        } catch (Exception e) {

            log.error("Manual approve checkin failed", e);
            throw new RuntimeException("Manual approve failed: " + e.getMessage());
        }

    }

    // =========================================================
    // MANUAL REJECT CHECKIN
    // =========================================================
    @Transactional
    public void manualRejectCheckin(
            Long attendanceId,
            String reason,
            User proctorUser
    ) {

        AttendanceSession attendance =
                attendanceRepo
                        .findById(attendanceId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Attendance not found"
                                )
                        );

        ExamSession session = attendance.getExamSession();

        // update attendance
        attendance.setStatus(AttendanceStatus.FAILED);
        attendance.setVerifiedAt(LocalDateTime.now());
        attendance.setVerifiedBy(proctorUser);
        attendance.setReviewNote(reason);
        attendanceRepo.save(attendance);
        // block session
        sessionStateService.updateStatus(
                session,
                ExamSessionStatus.BLOCKED,
                "Phiên thi đã bị khóa bởi giám thị"
        );

        session.setIsFlagged(true);
        session.setReviewResolvedAt(LocalDateTime.now());
        examSessionService.save(session);

        // gửi alert
        sendAlert(
                session,
                AlertType.REJECTED,
                "Điểm danh bị từ chối: " + reason,
                RiskLevel.HIGH
        );

        sendAlert(
                session,
                AlertType.SESSION_BLOCKED,
                "Phiên thi đã bị khóa",
                RiskLevel.HIGH
        );

        // ghi log
        logService.log(
                "MANUAL_CHECKIN_REJECT",
                reason,
                "CHECKIN",
                "FAILED",
                session
        );

        log.warn(
                "Manual reject checkin attendanceId={} sessionId={}",
                attendanceId,
                session.getId()
        );
    }

    public AttendanceSessionResponse getAttendance(
            Long sessionId
    ) {

        AttendanceSession attendance = attendanceService.getBySession(sessionId);

        return AttendanceSessionMapper.toResponse(attendance);
    }

    // =========================================================
    // helper restore status
    // =========================================================
    private void restoreSessionStatus(
            ExamSession session
    ) {

        if (session.getSessionStart() == null) {

            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.CHECKED_IN,
                    "Điểm danh thành công, vui lòng xác minh khuôn mặt"
            );

        } else {

            sessionStateService.updateStatus(
                    session,
                    ExamSessionStatus.IN_PROGRESS,
                    "Đã được phép vào thi"
            );
        }
    }

    // =========================================================
    // GET ATTENDANCE BY ID
    // =========================================================
    public AttendanceSessionResponse getAttendanceById(
            Long attendanceId
    ) {

        AttendanceSession attendance =
                attendanceRepo
                        .findById(attendanceId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Attendance not found"
                                )
                        );

        return AttendanceSessionMapper.toResponse(attendance);
    }

    // =========================================================
    // GET PENDING ATTENDANCES
    // =========================================================
    public List<AttendanceSessionResponse> getPendingAttendances() {

        return attendanceRepo
                .findByStatus(
                        AttendanceStatus.PENDING
                )
                .stream()
                .map(
                        AttendanceSessionMapper::toResponse
                )
                .toList();
    }

}