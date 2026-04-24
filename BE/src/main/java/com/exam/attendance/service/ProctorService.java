package com.exam.attendance.service;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.entity.IdentityVerification;
import com.exam.attendance.data.mapper.ProctorMapper;
import com.exam.attendance.data.pojo.AttendanceStatus;
import com.exam.attendance.data.pojo.ExamSessionStatus;
import com.exam.attendance.data.pojo.ProctorDashboardDTO;
import com.exam.attendance.data.request.ProctorDashboardFilterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
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

    // 1. DASHBOARD
    public Page<ProctorDashboardDTO> getDashboard(ProctorDashboardFilterRequest req) {
        return examSessionService.getDashboard(req);
    }

    // FAST version
    public List<ProctorDashboardDTO> getDashboardFast(Long roomId) {

        List<Object[]> rows = examSessionService.getDashboardRaw(roomId);

        return rows.stream().map(row -> {

            ExamSession session = (ExamSession) row[0];
            AttendanceSession attendance = (AttendanceSession) row[1];
            IdentityVerification latest = (IdentityVerification) row[2];

            return proctorMapper.toDTO(session, attendance, latest);

        }).toList();
    }

    // 2. VERIFY HISTORY
    public List<IdentityVerification> getVerificationHistory(Long sessionId) {
        return verificationService.getHistory(sessionId);
    }
    // 3. ATTENDANCE
    public AttendanceSession getAttendance(Long sessionId) {
        return attendanceService.getBySession(sessionId);
    }

    // 4. APPROVE
    @Transactional
    public void approve(Long sessionId, Long proctorId) {

        ExamSession session = examSessionService.getById(sessionId);

        validateCanApprove(session);

        AttendanceSession attendance =
                attendanceService.getOrCreate(session);

        attendance.setStatus(AttendanceStatus.VERIFIED);
        attendance.setVerifiedAt(LocalDateTime.now());
        attendance.setVerifiedBy(session.getUser());

        attendanceService.save(attendance);

        session.setStatus(ExamSessionStatus.CHECKED_IN);
        examSessionService.save(session);

        logService.log(
                "MANUAL_APPROVE",
                "Approved by proctorId=" + proctorId,
                "ADMIN",
                "SUCCESS",
                session
        );
    }

    // 5. REJECT
    @Transactional
    public void reject(Long sessionId, String reason) {

        ExamSession session = examSessionService.getById(sessionId);

        AttendanceSession attendance =
                attendanceService.getBySession(sessionId);

        if (attendance == null) {
            throw new RuntimeException("Attendance not found");
        }

        if (attendance.getStatus() == AttendanceStatus.VERIFIED) {
            throw new RuntimeException("Already verified");
        }

        attendance.setStatus(AttendanceStatus.FAILED);
        attendance.setVerifiedAt(LocalDateTime.now());

        attendanceService.save(attendance);

        logService.log(
                "MANUAL_REJECT",
                reason,
                "ADMIN",
                "FAILED",
                session
        );
    }

    // 6. FLAG
    @Transactional
    public void flag(Long sessionId, String reason) {

        ExamSession session = examSessionService.getById(sessionId);

        if (Boolean.TRUE.equals(session.getIsFlagged())) return;

        session.setIsFlagged(true);
        examSessionService.save(session);

        logService.log(
                "FLAGGED",
                reason,
                "CHEAT",
                "FAILED",
                session
        );
    }

    // 7. UNFLAG
    @Transactional
    public void unflag(Long sessionId) {

        ExamSession session = examSessionService.getById(sessionId);

        session.setIsFlagged(false);
        examSessionService.save(session);

        logService.log(
                "UNFLAG",
                "Proctor removed flag",
                "ADMIN",
                "SUCCESS",
                session
        );
    }

    // 8. FLAGGED LIST
    public List<ExamSession> getFlaggedSessions() {
        return examSessionService.getFlaggedSessions();
    }

    // VALIDATION
    private void validateCanApprove(ExamSession session) {

        if (session.getStatus().equals(ExamSessionStatus.DONE)) {
            throw new RuntimeException("Session already finished");
        }

        if (Boolean.TRUE.equals(session.getIsFlagged())) {
            throw new RuntimeException("Session is flagged");
        }
    }
}