package com.exam.attendance.service;

import com.exam.attendance.data.entity.AttendanceSession;
import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.repository.AttendanceSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AttendanceSessionService {
    private final AttendanceSessionRepository repo;

    public AttendanceSession getBySession(Long sessionId) {
        return repo.findByExamSessionId(sessionId).orElse(null);
    }

    public AttendanceSession getOrCreate(ExamSession session) {
        return repo.findByExamSessionId(session.getId())
                .orElseGet(() -> {
                    AttendanceSession as = new AttendanceSession();
                    as.setExamSession(session);
                    as.setCheckinTime(LocalDateTime.now());
                    return as;
                });
    }

    public void save(AttendanceSession attendance) {
        repo.save(attendance);
    }
}
