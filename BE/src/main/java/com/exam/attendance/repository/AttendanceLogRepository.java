package com.exam.attendance.repository;

import com.exam.attendance.data.entity.AttendanceLog;
import com.exam.attendance.data.pojo.report.LogReportDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {
    List<AttendanceLog> findByExamSessionId(Long examSessionId);

    @Query("""
SELECT new com.exam.attendance.data.pojo.report.LogReportDTO(
    l.action,
    l.type,
    l.result,
    l.createdAt,
    l.detail
)
FROM AttendanceLog l
JOIN l.examSession es
WHERE es.room.id = :roomId
ORDER BY l.createdAt DESC
""")
    List<LogReportDTO> getLogReport(Long roomId);
}