package com.exam.attendance.service.socket;

import com.exam.attendance.data.entity.ExamSession;
import com.exam.attendance.data.pojo.SessionStateMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SessionSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendSessionState(
            ExamSession session,
            String message
    ) {

        SessionStateMessage payload =
                SessionStateMessage.builder()
                        .sessionId(session.getId())
                        .status(session.getStatus().name())
                        .flagged(session.getIsFlagged())
                        .message(message)
                        .timestamp(System.currentTimeMillis())
                        .build();

        messagingTemplate.convertAndSendToUser(
                session.getUser().getId().toString(),
                "/queue/session",
                payload
        );
    }
}
