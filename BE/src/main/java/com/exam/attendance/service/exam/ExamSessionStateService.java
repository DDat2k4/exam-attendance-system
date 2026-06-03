package com.exam.attendance.service;

import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.pojo.enums.ExamSessionStatus;
import com.exam.attendance.repository.ExamSessionRepository;
import com.exam.attendance.service.socket.SessionSocketService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SessionStateService {

    private final SessionSocketService socketService;

    @Transactional
    public void updateStatus(
            ExamSession session,
            ExamSessionStatus status,
            String message
    ) {

        session.setStatus(status);
        socketService.sendSessionState(
                session,
                message
        );
    }
}
