package com.exam.attendance.service;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.entity.IdentityVerification;
import com.exam.attendance.data.entity.User;
import com.exam.attendance.data.mapper.ProctorMapper;
import com.exam.attendance.data.pojo.AlertMessage;
import com.exam.attendance.data.pojo.ProctorDashboardDTO;
import com.exam.attendance.data.pojo.enums.AlertType;
import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import com.exam.attendance.data.pojo.enums.RiskLevel;
import com.exam.attendance.data.request.ProctorDashboardFilterRequest;
import com.exam.attendance.service.socket.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
    // ATTENDANCE
    // =========================================================

    public AttendanceSession getAttendance(
            Long sessionId
    ) {

        return attendanceService.getBySession(sessionId);
    }

    // =========================================================
    // APPROVE
    // =========================================================

    @Transactional
    public void approve(
            Long sessionId,
            User proctorUser
    ) {

        ExamSession session =
                examSessionService.getById(sessionId);

        validateCanApprove(session);

        AttendanceSession attendance =
                attendanceService.getOrCreate(session);

        attendance.setStatus(
                AttendanceStatus.VERIFIED
        );

        attendance.setVerifiedAt(
                LocalDateTime.now()
        );

        attendance.setVerifiedBy(
                proctorUser
        );

        attendanceService.save(attendance);

        // restore correct status
        if (session.getSessionStart() == null) {

            session.setStatus(
                    ExamSessionStatus.CHECKED_IN
            );

        } else {

            session.setStatus(
                    ExamSessionStatus.IN_PROGRESS
            );
        }

        session.setIsFlagged(false);

        session.setLastSeenAt(
                LocalDateTime.now()
        );

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

        ExamSession session =
                examSessionService.getById(sessionId);

        AttendanceSession attendance =
                attendanceService.getOrCreate(session);

        attendance.setStatus(
                AttendanceStatus.FAILED
        );

        attendance.setVerifiedAt(
                LocalDateTime.now()
        );

        attendance.setVerifiedBy(
                proctorUser
        );

        attendanceService.save(attendance);

        session.setStatus(
                ExamSessionStatus.BLOCKED
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

        if (Boolean.TRUE.equals(
                session.getIsFlagged()
        )) {
            return;
        }

        session.setIsFlagged(true);

        // không block ngay
        session.setStatus(
                ExamSessionStatus.PENDING_REVIEW
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

        ExamSession session =
                examSessionService.getById(sessionId);

        session.setIsFlagged(false);

        // restore trạng thái
        if (session.getSessionStart() == null) {

            session.setStatus(
                    ExamSessionStatus.CHECKED_IN
            );

        } else {

            session.setStatus(
                    ExamSessionStatus.IN_PROGRESS
            );
        }

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
            String newDeviceId,
            User proctorUser
    ) {

        ExamSession session =
                examSessionService.getById(sessionId);

        session.setDeviceId(newDeviceId);

        session.setIsFlagged(false);

        // restore status
        if (session.getSessionStart() == null) {

            session.setStatus(
                    ExamSessionStatus.CHECKED_IN
            );

        } else {

            session.setStatus(
                    ExamSessionStatus.IN_PROGRESS
            );
        }

        session.setLastSeenAt(
                LocalDateTime.now()
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

        if (session.getStatus()
                == ExamSessionStatus.DONE) {

            throw new RuntimeException(
                    "Session already finished"
            );
        }

        if (session.getStatus()
                == ExamSessionStatus.BLOCKED) {

            throw new RuntimeException(
                    "Session already blocked"
            );
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
}