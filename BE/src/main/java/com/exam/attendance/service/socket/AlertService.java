package com.exam.attendance.service.socket;

import com.exam.attendance.data.pojo.AlertMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final SimpMessagingTemplate messagingTemplate;

    private final ConcurrentHashMap<Long, Long> lastSent = new ConcurrentHashMap<>();

    private static final long DEBOUNCE_MS = 5000; // 5s

    public void sendAlert(AlertMessage alert) {

        Long now = System.currentTimeMillis();

        Long last = lastSent.get(alert.getSessionId());

        if (last != null && (now - last) < DEBOUNCE_MS) {
            return; // skip spam
        }

        lastSent.put(alert.getSessionId(), now);

        String destination = "/topic/room/" + alert.getRoomId();

        messagingTemplate.convertAndSend(destination, alert);
    }
}