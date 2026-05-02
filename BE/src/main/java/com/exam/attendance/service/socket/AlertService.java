package com.exam.attendance.service.socket;

import com.exam.attendance.data.pojo.AlertMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final SimpMessagingTemplate messagingTemplate;

    private final ConcurrentHashMap<String, Long> lastSent = new ConcurrentHashMap<>();

    private static final long DEBOUNCE_MS = 5000;

    public void sendAlert(AlertMessage alert) {

        String key = alert.getSessionId() + "_" + alert.getType();
        long now = System.currentTimeMillis();

        Long last = lastSent.get(key);

        if (last != null && (now - last) < DEBOUNCE_MS) {
            return;
        }

        lastSent.put(key, now);

        if (alert.getTimestamp() == null) {
            alert.setTimestamp(now);
        }

        // broadcast cho proctor
        if (alert.getRoomId() != null) {
            messagingTemplate.convertAndSend(
                    "/topic/room/" + alert.getRoomId(),
                    alert
            );
        }

        // gửi riêng user (student)
        if (alert.getUserId() != null) {
            messagingTemplate.convertAndSendToUser(
                    alert.getUserId().toString(),
                    "/queue/session",
                    alert
            );
        }

        log.info("WS sent -> room={}, user={}, type={}",
                alert.getRoomId(),
                alert.getUserId(),
                alert.getType());
    }

    // Send riêng user
    public void sendToUser(AlertMessage alert) {
        messagingTemplate.convertAndSendToUser(
                alert.getUserId().toString(),
                "/queue/session",
                alert
        );
    }
}