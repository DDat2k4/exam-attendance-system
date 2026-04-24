package com.exam.attendance.data.request;

import lombok.Data;

@Data
public class ExamSessionStartRequest {
    private Long examId;
    private Long roomId;
    private String deviceId;
}