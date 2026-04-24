package com.exam.attendance.repository;

import com.exam.attendance.data.entity.IdentityVerification;
import com.exam.attendance.data.pojo.report.VerificationReportDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IdentityVerificationRepository extends JpaRepository<IdentityVerification, Long> {
    long countByExamSessionId(Long examSessionId);

    long countByExamSessionIdAndTypeAndVerifiedFalse(Long examSessionId, String type);

    @Query("""
SELECT iv
FROM IdentityVerification iv
LEFT JOIN FETCH iv.examSession
LEFT JOIN FETCH iv.user
WHERE iv.examSession.id = :sessionId
ORDER BY iv.createdAt DESC
""")
    List<IdentityVerification> findHistory(@Param("sessionId") Long sessionId);

    Optional<IdentityVerification> findTopByExamSessionIdOrderByCreatedAtDesc(Long examSessionId);

    @Query("""
SELECT new com.exam.attendance.data.pojo.report.VerificationReportDTO(
    cc.citizenId,
    iv.attemptNo,
    iv.verified,
    iv.confidence,
    iv.failReason,
    iv.deviceId
)
FROM IdentityVerification iv
JOIN iv.examSession es
JOIN iv.user u
LEFT JOIN u.citizenCard cc
WHERE es.room.id = :roomId
""")
    List<VerificationReportDTO> getVerificationReport(Long roomId);
}