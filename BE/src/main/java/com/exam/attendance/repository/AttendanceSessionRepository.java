package com.exam.attendance.repository;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.pojo.report.AttendanceReportDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {

    Optional<AttendanceSession> findByExamSessionId(Long examSessionId);

    @Query("""
SELECT new com.exam.attendance.data.pojo.report.AttendanceReportDTO(
    cc.citizenId,
    up.name,
    a.status,
    a.checkinTime,
    v.username,
    r.roomCode
)
FROM AttendanceSession a
JOIN a.examSession es
JOIN es.user u
LEFT JOIN u.citizenCard cc
LEFT JOIN u.userProfile up
LEFT JOIN a.verifiedBy v
LEFT JOIN es.room r
WHERE es.room.id = :roomId
""")
    List<AttendanceReportDTO> getAttendanceReport(Long roomId);
}