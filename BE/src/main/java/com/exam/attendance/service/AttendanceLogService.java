package com.exam.attendance.service;

import com.exam.attendance.data.entity.AttendanceLog;
import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.repository.AttendanceLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AttendanceLogService {

    private final AttendanceLogRepository repo;

    public void log(String action, String detail,
                    String type, String result,
                    ExamSession session) {

        AttendanceLog log = new AttendanceLog();
        log.setAction(action);
        log.setDetail(detail);
        log.setType(type);
        log.setResult(result);
        log.setCreatedAt(LocalDateTime.now());
        log.setExamSession(session);

        repo.save(log);
    }
}
