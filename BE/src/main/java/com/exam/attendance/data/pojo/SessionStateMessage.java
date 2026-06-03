package com.exam.attendance.data.pojo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SessionStateMessage {

    private Long sessionId;
    private String status;
    private Boolean flagged;
    private String message;
    private Long timestamp;
}
