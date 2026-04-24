package com.exam.attendance.data.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExamRegistrationResponse {
    private Long id;
    private Long examId;
    private Long userId;
    private Short status;
    private LocalDateTime registeredAt;
}