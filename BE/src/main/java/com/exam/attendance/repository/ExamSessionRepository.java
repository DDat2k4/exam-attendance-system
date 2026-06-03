package com.exam.attendance.repository;

import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.enums.ExamSessionStatus;
import com.exam.attendance.data.pojo.ProctorDashboard;
import com.exam.attendance.data.pojo.report.Summary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExamSessionRepository extends JpaRepository<ExamSession, Long> {

    Long countByRoomId(Long roomId);

    List<ExamSession> findByUserId(Long userId);

    @Query("""
    SELECT es FROM ExamSession es
    JOIN FETCH es.user u
    JOIN FETCH u.citizenCard
    WHERE es.id = :id
""")
    Optional<ExamSession> findFullById(Long id);

    @Query("""
        SELECT es FROM ExamSession es
        WHERE es.isFlagged = true
    """)
    List<ExamSession> findFlaggedSessions();

    @Query("""
SELECT new com.exam.attendance.data.pojo.ProctorDashboard(
    es.id,
    u.id,
    up.name,
    up.citizenId,
    r.roomCode,
    ats.status,
    es.isFlagged,
    null,
    iv.confidence,
    iv.verifiedAt,
    iv.deviceId,
    iv.attemptNo,
    iv.id,
    iv.captureImageUrl,
    es.status
)
FROM ExamSession es
JOIN es.user u
LEFT JOIN u.userProfile up
JOIN es.room r

LEFT JOIN AttendanceSession ats 
    ON ats.examSession.id = es.id 
    AND ats.id = (
        SELECT MAX(a2.id)
        FROM AttendanceSession a2
        WHERE a2.examSession.id = es.id
    )

LEFT JOIN IdentityVerification iv 
    ON iv.examSession.id = es.id 
    AND iv.id = (
        SELECT MAX(i2.id)
        FROM IdentityVerification i2
        WHERE i2.examSession.id = es.id
    )

WHERE (:roomId IS NULL OR r.id = :roomId)
  AND (:status IS NULL OR es.status = :status)
  AND (:flagged IS NULL OR es.isFlagged = :flagged)

AND (
    :keyword IS NULL
    OR LOWER(COALESCE(up.name, ''))
        LIKE CONCAT('%', LOWER(:keyword), '%')
    OR LOWER(COALESCE(up.citizenId, ''))
        LIKE CONCAT('%', LOWER(:keyword), '%')
)
""")
    List<ProctorDashboard> findDashboard(
            @Param("roomId") Long roomId,
            @Param("status") ExamSessionStatus status,
            @Param("flagged") Boolean flagged,
            @Param("keyword") String keyword
    );

    @Query("""
    SELECT es, a, iv FROM ExamSession es
    LEFT JOIN AttendanceSession a ON a.examSession.id = es.id
    LEFT JOIN IdentityVerification iv ON iv.examSession.id = es.id
    AND iv.createdAt = (
        SELECT MAX(iv2.createdAt)
        FROM IdentityVerification iv2
        WHERE iv2.examSession.id = es.id
    )
    WHERE es.room.id = :roomId
    """)
    List<Object[]> getDashboardFull(Long roomId);

    boolean existsByExamId(Long examId);

    boolean existsByRoomId(Long roomId);

    @Query("""
SELECT new com.exam.attendance.data.pojo.report.Summary(
    COUNT(DISTINCT es.id),
    COALESCE(SUM(CASE WHEN a.status = com.exam.attendance.data.enums.AttendanceStatus.VERIFIED THEN 1L ELSE 0L END), 0L),
    COALESCE(SUM(CASE WHEN a.status = com.exam.attendance.data.enums.AttendanceStatus.FAILED THEN 1L ELSE 0L END), 0L),
    COALESCE(SUM(CASE WHEN a.status = com.exam.attendance.data.enums.AttendanceStatus.BLOCKED THEN 1L ELSE 0L END), 0L),
    COALESCE(SUM(CASE WHEN a.status = com.exam.attendance.data.enums.AttendanceStatus.PENDING THEN 1L ELSE 0L END), 0L)

)
FROM ExamSession es
LEFT JOIN AttendanceSession a
    ON a.examSession.id = es.id
    AND a.id = (
        SELECT MAX(a2.id)
        FROM AttendanceSession a2
        WHERE a2.examSession.id = es.id
    )
WHERE es.room.id = :roomId
""")
    Summary getSummary(Long roomId);

    Optional<ExamSession> findFirstByUserIdAndExamIdAndStatusInOrderBySessionStartDesc(
            Long userId,
            Long examId,
            List<ExamSessionStatus> statuses
    );

    boolean existsByExamIdAndUserIdAndStatusIn(
            Long examId,
            Long userId,
            List<ExamSessionStatus> statuses
    );

    @Query("""
SELECT es
FROM ExamSession es
JOIN es.exam e
JOIN es.room r
JOIN es.user u
JOIN u.userProfile up
WHERE e.semester = :semester
AND e.examCode = :examCode
AND r.roomCode = :roomCode
AND up.citizenId = :citizenId
""")
    Optional<ExamSession> findByCheckinInfo(
            @Param("semester") String semester,
            @Param("examCode") String examCode,
            @Param("roomCode") String roomCode,
            @Param("citizenId") String citizenId
    );

    Optional<ExamSession> findFirstByUserIdAndExamIdOrderByIdDesc(
            Long userId,
            Long examId
    );
}