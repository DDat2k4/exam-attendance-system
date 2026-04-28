package com.exam.attendance.data.mapper;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.entity.IdentityVerification;
import com.exam.attendance.data.pojo.enums.AttendanceStatus;
import com.exam.attendance.data.pojo.ProctorDashboardDTO;
import com.exam.attendance.data.pojo.enums.RiskLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ProctorMapper {

    public ProctorDashboardDTO toDTO(
            ExamSession session,
            AttendanceSession attendance,
            IdentityVerification iv
    ) {

        return ProctorDashboardDTO.builder()
                .sessionId(session.getId())
                .userId(session.getUser() != null ? session.getUser().getId() : null)
                .studentName(
                        session.getUser() != null
                                ? session.getUser().getUsername()
                                : null
                )
                .citizenId(
                        session.getUser() != null
                                && session.getUser().getUserProfile() != null
                                ? session.getUser().getUserProfile().getCitizenId()
                                : null
                )
                .roomCode(
                        session.getRoom() != null
                                ? session.getRoom().getRoomCode()
                                : null
                )
                .attendanceStatus(
                        attendance != null
                                ? attendance.getStatus()
                                : AttendanceStatus.PENDING
                )
                .flagged(Boolean.TRUE.equals(session.getIsFlagged()))

                // ===================== RISK LEVEL =====================
                .riskLevel(
                        calculateRisk(
                                iv != null ? iv.getConfidence() : null,
                                session.getIsFlagged(),
                                attendance,
                                iv
                        )
                )

                .lastConfidence(iv != null ? iv.getConfidence() : null)
                .lastVerifyTime(iv != null ? iv.getCreatedAt() : null)
                .deviceId(iv != null ? iv.getDeviceId() : session.getDeviceId())
                .attemptNo(iv != null ? iv.getAttemptNo() : null)
                .lastVerifyId(iv != null ? iv.getId() : null)
                .captureImageUrl(iv != null ? iv.getCaptureImageUrl() : null)
                .examSessionStatus(session.getStatus())
                .build();
    }

    public RiskLevel calculateRisk(
            Double confidence,
            Boolean flagged,
            AttendanceSession attendance,
            IdentityVerification iv
    ) {

        int score = 0;

        // 1. FLAGGED SESSION (rất nguy hiểm)
        if (Boolean.TRUE.equals(flagged)) {
            score += 3;
        }

        // 2. NO IDENTITY_VERIFICATION
        if (iv == null || confidence == null) {
            score += 2;
        } else {
            if (confidence < 0.5) {
                score += 3;
            } else if (confidence < 0.75) {
                score += 1;
            }

            if (Boolean.FALSE.equals(iv.getVerified())) {
                score += 2;
            }
        }

        // 3. ATTENDANCE ISSUE
        if (attendance == null) {
            score += 2;
        } else if (attendance.getStatus() != AttendanceStatus.VERIFIED) {
            score += 1;
        }

        // 4. FINAL DECISION
        if (score >= 5) return RiskLevel.HIGH;
        if (score >= 2) return RiskLevel.MEDIUM;

        return RiskLevel.LOW;
    }
}