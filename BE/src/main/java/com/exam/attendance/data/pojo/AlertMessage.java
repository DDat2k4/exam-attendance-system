package com.exam.attendance.data.pojo;

import com.exam.attendance.data.pojo.enums.RiskLevel;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AlertMessage {

    private Long sessionId;
    private Long userId;
    private Long roomId;
    private String message;
    private RiskLevel severity;
    private Long timestamp;
}