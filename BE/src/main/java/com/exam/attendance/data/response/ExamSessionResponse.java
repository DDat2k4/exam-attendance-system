package com.exam.attendance.data.response;

import com.exam.attendance.data.pojo.ExamSessionStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamSessionResponse {

    private Long id;
    private LocalDateTime sessionStart;
    private LocalDateTime sessionEnd;
    private ExamSessionStatus status;
    private Boolean isFlagged;

    private String deviceId;

    private Long examId;
    private Long userId;
    private Long roomId;
}