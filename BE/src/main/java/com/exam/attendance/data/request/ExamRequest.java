package com.exam.attendance.data.request;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ExamRequest {
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}