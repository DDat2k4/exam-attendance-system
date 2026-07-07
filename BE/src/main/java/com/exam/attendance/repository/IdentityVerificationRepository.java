package com.exam.attendance.repository;

import com.exam.attendance.data.entity.IdentityVerification;
import com.exam.attendance.data.pojo.report.VerificationReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface IdentityVerificationRepository extends JpaRepository<IdentityVerification, Long> {

    @Query("""
SELECT iv
FROM IdentityVerification iv
LEFT JOIN FETCH iv.examSession
LEFT JOIN FETCH iv.user
WHERE iv.examSession.id = :sessionId
ORDER BY iv.createdAt DESC
""")
    List<IdentityVerification> findHistory(@Param("sessionId") Long sessionId);

    @Query("""
SELECT new com.exam.attendance.data.pojo.report.VerificationReport(
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
  AND iv.confidence != 1
""")
    List<VerificationReport> getVerificationReport(Long roomId);

    @Query("""
        select count(iv) > 0
        from IdentityVerification iv
        where iv.examSession.id = :sessionId
        and iv.type = 'INITIAL'
        and iv.verified = true
        and iv.createdAt >= :fromTime
    """)
    boolean existsInitialVerified(
            @Param("sessionId") Long sessionId,
            @Param("fromTime") LocalDateTime fromTime
    );

    List<IdentityVerification>
    findTop20ByExamSessionIdAndTypeOrderByCreatedAtDesc(
            Long sessionId,
            String type
    );
}