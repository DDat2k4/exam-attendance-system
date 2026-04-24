package com.exam.attendance.data.request;

import lombok.Data;

@Data
public class VerifyRequest {
    private Long userId;
    private Long examSessionId;
    private String status; // VERIFIED / FAILED
    private Float confidence;
    private String deviceId;
    private String ipAddress;
    private String userAgent;
    private String type; // INITIAL / RANDOM
    private String captureImage;
}